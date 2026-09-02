"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfileRow } from "@/lib/data/profile";
import { parseCvWithAI } from "@/lib/ai/prompts/cv-parsing";
import { extractTextFromCvFile } from "@/lib/cv-file-text";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const experienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  startDate: z.preprocess(emptyToNull, z.string().nullable().optional()),
  endDate: z.preprocess(emptyToNull, z.string().nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

const profileSchema = z.object({
  firstName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  lastName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  email: z.preprocess(emptyToNull, z.string().nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().nullable().optional()),
  educationLevel: z.preprocess(emptyToNull, z.string().nullable().optional()),
  fieldOfStudy: z.preprocess(emptyToNull, z.string().nullable().optional()),
  graduationYear: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  yearsOfExperience: z.coerce.number().int().min(0).default(0),
  experiences: z.array(experienceSchema).default([]),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.object({ language: z.string(), level: z.string() })).default([]),
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
      educationLevel: data.educationLevel,
      fieldOfStudy: data.fieldOfStudy,
      graduationYear: data.graduationYear,
      yearsOfExperience: data.yearsOfExperience,
      experiences: JSON.stringify(data.experiences),
      skills: JSON.stringify(data.skills),
      languages: JSON.stringify(data.languages),
      workAuthorization: data.workAuthorization,
      availabilityNote: data.availabilityNote,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/profile");
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
  educationLevel: z.preprocess(emptyToNull, z.string().nullable().optional()),
  fieldOfStudy: z.preprocess(emptyToNull, z.string().nullable().optional()),
  graduationYear: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  yearsOfExperience: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.object({ language: z.string(), level: z.string() })).default([]),
  experiences: z.array(experienceSchema).default([]),
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
      ...(data.educationLevel ? { educationLevel: data.educationLevel } : {}),
      ...(data.fieldOfStudy ? { fieldOfStudy: data.fieldOfStudy } : {}),
      ...(data.graduationYear ? { graduationYear: data.graduationYear } : {}),
      ...(data.yearsOfExperience !== null && data.yearsOfExperience !== undefined
        ? { yearsOfExperience: data.yearsOfExperience }
        : {}),
      ...(data.skills.length ? { skills: JSON.stringify(data.skills) } : {}),
      ...(data.languages.length ? { languages: JSON.stringify(data.languages) } : {}),
      ...(data.experiences.length ? { experiences: JSON.stringify(data.experiences) } : {}),
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/profile");
}
