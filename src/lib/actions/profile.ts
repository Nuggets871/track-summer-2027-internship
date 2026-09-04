"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfileRow } from "@/lib/data/profile";
import { parseCvWithAI } from "@/lib/ai/prompts/cv-parsing";
import { extractTextFromCvFile } from "@/lib/cv-file-text";
import { recomputeAllLocalScores } from "@/lib/discover/scoring";
import { normalizeSkillList } from "@/lib/skill-normalization";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

/** Accepts "github.com/x" as readily as "https://github.com/x" — job forms
 * and users alike rarely bother typing the scheme, and a link without one
 * silently breaks both the "open" button and copy-paste into most fields. */
const normalizeUrl = (v: unknown) => {
  if (typeof v !== "string" || !v.trim()) return null;
  const trimmed = v.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const experienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  startDate: z.preprocess(emptyToNull, z.string().nullable().optional()),
  endDate: z.preprocess(emptyToNull, z.string().nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  startDate: z.preprocess(emptyToNull, z.string().nullable().optional()),
  endDate: z.preprocess(emptyToNull, z.string().nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

const projectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()).default([]),
  url: z.preprocess(normalizeUrl, z.string().nullable().optional()),
  repositoryUrl: z.preprocess(normalizeUrl, z.string().nullable().optional()),
});

const profileSchema = z.object({
  firstName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  lastName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  email: z.preprocess(emptyToNull, z.string().nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().nullable().optional()),
  location: z.preprocess(emptyToNull, z.string().nullable().optional()),
  headline: z.preprocess(emptyToNull, z.string().nullable().optional()),
  summary: z.preprocess(emptyToNull, z.string().nullable().optional()),
  linkedinUrl: z.preprocess(normalizeUrl, z.string().nullable().optional()),
  githubUrl: z.preprocess(normalizeUrl, z.string().nullable().optional()),
  portfolioUrl: z.preprocess(normalizeUrl, z.string().nullable().optional()),
  educationLevel: z.preprocess(emptyToNull, z.string().nullable().optional()),
  fieldOfStudy: z.preprocess(emptyToNull, z.string().nullable().optional()),
  graduationYear: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  yearsOfExperience: z.coerce.number().int().min(0).default(0),
  experiences: z.array(experienceSchema).default([]),
  educationHistory: z.array(educationSchema).default([]),
  projects: z.array(projectSchema).default([]),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.object({ language: z.string(), level: z.string(), detail: z.preprocess(emptyToNull, z.string().nullable().optional()) })).default([]),
  workAuthorization: z.preprocess(emptyToNull, z.string().nullable().optional()),
  availabilityNote: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export async function updateProfile(raw: ProfileInput) {
  await getOrCreateProfileRow();
  const data = profileSchema.parse(raw);

  await prisma.profile.update({
    where: { id: "singleton" },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      location: data.location,
      headline: data.headline,
      summary: data.summary,
      linkedinUrl: data.linkedinUrl,
      githubUrl: data.githubUrl,
      portfolioUrl: data.portfolioUrl,
      educationLevel: data.educationLevel,
      fieldOfStudy: data.fieldOfStudy,
      graduationYear: data.graduationYear,
      yearsOfExperience: data.yearsOfExperience,
      experiences: JSON.stringify(data.experiences),
      educationHistory: JSON.stringify(data.educationHistory),
      projects: JSON.stringify(data.projects),
      skills: JSON.stringify(normalizeSkillList(data.skills)),
      languages: JSON.stringify(data.languages),
      workAuthorization: data.workAuthorization,
      availabilityNote: data.availabilityNote,
    },
  });

  // The Match Score for every Discover listing depends on this profile —
  // recompute it now (pure arithmetic, no AI call) rather than letting
  // scores silently go stale until the next sync.
  await recomputeAllLocalScores();

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  revalidatePath("/discover");
}

// --- CV upload & parsing --------------------------------------------------

export type CvParsePreview = {
  documentId: string;
  rawText: string;
  detected: Awaited<ReturnType<typeof parseCvWithAI>>;
};

/**
 * Step 1 of "Upload CV": saves the file as a Document (category CV),
 * extracts its text, and asks the AI to detect structured fields — but
 * does NOT touch the Profile yet. The caller shows a review screen and the
 * user explicitly confirms via `applyCvToProfile` before anything is
 * merged in, so an upload never silently overwrites existing profile data.
 */
export async function uploadAndParseCv(formData: FormData): Promise<CvParsePreview> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Aucun fichier fourni");

  const buffer = Buffer.from(await file.arrayBuffer());
  const rawText = await extractTextFromCvFile(buffer, file.name, file.type || null);
  if (!rawText.trim()) throw new Error("Impossible d'extraire du texte de ce fichier.");

  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { randomUUID } = await import("node:crypto");
  const uploadsDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const ext = path.extname(file.name) || ".txt";
  const storedName = `${randomUUID()}${ext}`;
  await writeFile(path.join(uploadsDir, storedName), buffer);

  const document = await prisma.document.create({
    data: {
      name: file.name.replace(/\.[^.]+$/, ""),
      category: "CV",
      version: "v1",
      filePath: storedName,
      fileSize: file.size,
      mimeType: file.type || null,
    },
  });

  const detected = await parseCvWithAI(rawText);

  return { documentId: document.id, rawText, detected };
}

const applyCvSchema = z.object({
  documentId: z.string(),
  rawText: z.string(),
  firstName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  lastName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  email: z.preprocess(emptyToNull, z.string().nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().nullable().optional()),
  location: z.preprocess(emptyToNull, z.string().nullable().optional()),
  headline: z.preprocess(emptyToNull, z.string().nullable().optional()),
  summary: z.preprocess(emptyToNull, z.string().nullable().optional()),
  educationLevel: z.preprocess(emptyToNull, z.string().nullable().optional()),
  fieldOfStudy: z.preprocess(emptyToNull, z.string().nullable().optional()),
  graduationYear: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  yearsOfExperience: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.object({ language: z.string(), level: z.string(), detail: z.preprocess(emptyToNull, z.string().nullable().optional()) })).default([]),
  experiences: z.array(experienceSchema).default([]),
  educationHistory: z.array(educationSchema).default([]),
  projects: z.array(projectSchema).default([]),
});

/**
 * Step 2: the user has reviewed the detected fields (and possibly edited or
 * unchecked some) — this merges only what was confirmed. Existing profile
 * values are only replaced for the fields explicitly included here.
 */
export async function applyCvToProfile(raw: z.infer<typeof applyCvSchema>) {
  const data = applyCvSchema.parse(raw);
  await getOrCreateProfileRow();

  await prisma.profile.update({
    where: { id: "singleton" },
    data: {
      cvDocumentId: data.documentId,
      cvRawText: data.rawText,
      cvParsedAt: new Date(),
      ...(data.firstName ? { firstName: data.firstName } : {}),
      ...(data.lastName ? { lastName: data.lastName } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.location ? { location: data.location } : {}),
      ...(data.headline ? { headline: data.headline } : {}),
      ...(data.summary ? { summary: data.summary } : {}),
      ...(data.educationLevel ? { educationLevel: data.educationLevel } : {}),
      ...(data.fieldOfStudy ? { fieldOfStudy: data.fieldOfStudy } : {}),
      ...(data.graduationYear ? { graduationYear: data.graduationYear } : {}),
      ...(data.yearsOfExperience !== null && data.yearsOfExperience !== undefined
        ? { yearsOfExperience: data.yearsOfExperience }
        : {}),
      ...(data.skills.length ? { skills: JSON.stringify(normalizeSkillList(data.skills)) } : {}),
      ...(data.languages.length ? { languages: JSON.stringify(data.languages) } : {}),
      ...(data.experiences.length ? { experiences: JSON.stringify(data.experiences) } : {}),
      ...(data.educationHistory.length ? { educationHistory: JSON.stringify(data.educationHistory) } : {}),
      ...(data.projects.length ? { projects: JSON.stringify(data.projects) } : {}),
    },
  });

  await recomputeAllLocalScores();

  revalidatePath("/", "layout");
  revalidatePath("/profile");
  revalidatePath("/discover");
}
