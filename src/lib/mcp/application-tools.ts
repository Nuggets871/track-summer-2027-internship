import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/lib/data/profile";
import { ensureApplicationPipelineStages } from "@/lib/data/pipeline-stages";
import { logActivity } from "@/lib/data/activity";
import { clamp, safeJsonParse } from "@/lib/utils";
import { logMcpActivity } from "@/lib/internships";
import { generateCoverLetterForApplication, generateCvForApplication } from "@/lib/actions/ai-actions";
import { markApplicationAsSent, updateApplicationStatus } from "@/lib/actions/applications";
import { convertLead, discardLead } from "@/lib/actions/leads";
import type { CoverLetterLanguage, CoverLetterTone } from "@/lib/ai/prompts/cover-letter";
import type { CvLanguage } from "@/lib/ai/prompts/cv-generation";

/**
 * MCP tools that let an agent drive the "Postuler → Suivre" half of the app
 * without touching the database directly: read one opportunity in full (ready
 * to fill an external application form), move it through the pipeline, record
 * notes, and trigger the app's own cover-letter / tailored-CV generation.
 *
 * Everything is thin glue over the existing business logic — status changes go
 * through the same `markApplicationAsSent`/`updateApplicationStatus` actions as
 * the UI, and generation reuses `generateCoverLetterForApplication` /
 * `generateCvForApplication`, so the timeline, follow-up scheduling and AI
 * prompts stay identical.
 */

const iso = (value: Date | null | undefined): string | null => value?.toISOString() ?? null;

export type ApplicationListFilters = {
  query?: string | null;
  status?: string | null;
  hasCoverLetter?: boolean | null;
  hasCv?: boolean | null;
  limit?: number | null;
};

export type ApplicationListEntry = {
  id: string;
  company: string;
  title: string;
  url: string | null;
  statusKey: string;
  statusLabel: string;
  applicationType: string;
  source: string | null;
  country: string | null;
  city: string | null;
  appliedAt: string | null;
  deadline: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  matchScore: number | null;
  hasCoverLetter: boolean;
  hasCv: boolean;
};

/**
 * Lists tracked opportunities (not the inbox) with the fields an agent needs to
 * pick work: the status **key** (stable, unlike the label), whether documents
 * already exist, and the match score. Filters are case-insensitive.
 */
export async function listApplications(filters: ApplicationListFilters = {}): Promise<ApplicationListEntry[]> {
  const requestedLimit = filters.limit ?? 50;
  const limit = clamp(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit as number) : 50, 1, 200);
  const query = filters.query?.trim().toLowerCase();
  const status = filters.status?.trim().toLowerCase();

  const rows = await prisma.application.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      jobUrl: true,
      applicationType: true,
      source: true,
      appliedAt: true,
      deadline: true,
      nextAction: true,
      nextActionDate: true,
      company: { select: { name: true } },
      country: { select: { name: true } },
      city: { select: { name: true } },
      status: { select: { key: true, label: true } },
      coverLetter: { select: { id: true } },
      generatedCv: { select: { id: true } },
      jobAnalysis: { select: { matchScore: true } },
    },
  });

  const items: ApplicationListEntry[] = rows.map((row) => ({
    id: row.id,
    company: row.company.name,
    title: row.title,
    url: row.jobUrl,
    statusKey: row.status.key,
    statusLabel: row.status.label,
    applicationType: row.applicationType,
    source: row.source,
    country: row.country?.name ?? null,
    city: row.city?.name ?? null,
    appliedAt: iso(row.appliedAt),
    deadline: iso(row.deadline),
    nextAction: row.nextAction,
    nextActionDate: iso(row.nextActionDate),
    matchScore: row.jobAnalysis?.matchScore ?? null,
    hasCoverLetter: Boolean(row.coverLetter),
    hasCv: Boolean(row.generatedCv),
  }));

  const filtered = items
    .filter((item) => !query || item.company.toLowerCase().includes(query) || item.title.toLowerCase().includes(query))
    .filter((item) => !status || item.statusKey.toLowerCase() === status || item.statusLabel.toLowerCase().includes(status))
    .filter((item) => filters.hasCoverLetter == null || item.hasCoverLetter === filters.hasCoverLetter)
    .filter((item) => filters.hasCv == null || item.hasCv === filters.hasCv)
    .slice(0, limit);

  await logMcpActivity("listApplications", { listed: filtered.length });
  return filtered;
}

export type ApplicationPack = Awaited<ReturnType<typeof buildApplicationPack>>;

/**
 * Everything needed to fill one external application form and to attach the
 * generated documents: the opportunity, its analysis, the candidate's contact
 * block, and stable download paths for the tailored CV and cover letter.
 *
 * The paths are app-relative (`/api/cv/<id>/pdf`); prepend the deployment host
 * to fetch them.
 */
export async function buildApplicationPack(applicationId: string) {
  const [application, profile] = await Promise.all([
    prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        company: true,
        country: true,
        city: true,
        status: true,
        jobAnalysis: true,
        coverLetter: true,
        generatedCv: true,
        documents: { orderBy: { createdAt: "desc" } },
      },
    }),
    getProfile(),
  ]);

  if (!application) throw new Error(`Opportunité introuvable : ${applicationId}`);

  const analysis = application.jobAnalysis;
  const coverLetter = application.coverLetter;
  const cv = application.generatedCv;

  return {
    application: {
      id: application.id,
      title: application.title,
      targetRole: application.targetRole,
      company: application.company.name,
      url: application.jobUrl,
      statusKey: application.status.key,
      statusLabel: application.status.label,
      applicationType: application.applicationType,
      outreachChannel: application.outreachChannel,
      recipientName: application.recipientName,
      recipientValue: application.recipientValue,
      source: application.source,
      country: application.country?.name ?? null,
      city: application.city?.name ?? null,
      remotePossible: application.remotePossible,
      discoveredAt: iso(application.discoveredAt),
      appliedAt: iso(application.appliedAt),
      deadline: iso(application.deadline),
      nextAction: application.nextAction,
      nextActionDate: iso(application.nextActionDate),
      notes: application.notes,
      companyResearch: application.companyResearch,
    },
    job: analysis
      ? {
          matchScore: analysis.matchScore,
          eligibilityStatus: analysis.eligibilityStatus,
          eligibilityNotes: safeJsonParse<string[]>(analysis.eligibilityNotes, []),
          strengths: safeJsonParse<string[]>(analysis.strengths, []),
          watchouts: safeJsonParse<string[]>(analysis.watchouts, []),
          missingSkills: safeJsonParse<string[]>(analysis.missingSkills, []),
          requiredSkills: safeJsonParse<string[]>(analysis.requiredSkills, []),
          requiredLanguages: safeJsonParse<string[]>(analysis.requiredLanguages, []),
          requiredEducationLevel: analysis.requiredEducationLevel,
          requiredExperienceYears: analysis.requiredExperienceYears,
          recommendation: analysis.recommendation,
          description: analysis.rawExtractedText?.slice(0, 8_000) ?? null,
        }
      : null,
    candidate: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      fullName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      headline: profile.headline,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
      educationLevel: profile.educationLevel,
      fieldOfStudy: profile.fieldOfStudy,
      graduationYear: profile.graduationYear,
      yearsOfExperience: profile.yearsOfExperience,
      skills: profile.skills,
      languages: profile.languages,
      workAuthorization: profile.workAuthorization,
      availabilityNote: profile.availabilityNote,
      availabilityStart: iso(profile.availabilityStart),
      availabilityEnd: iso(profile.availabilityEnd),
      minDurationWeeks: profile.minDurationWeeks,
      maxDurationWeeks: profile.maxDurationWeeks,
    },
    coverLetter: coverLetter
      ? {
          exists: true,
          status: coverLetter.status,
          version: coverLetter.version,
          language: coverLetter.language,
          content: coverLetter.content,
          downloadPdf: `/api/cover-letter/${application.id}/pdf`,
          downloadDocx: `/api/cover-letter/${application.id}/docx`,
        }
      : { exists: false },
    cv: cv
      ? {
          exists: true,
          status: cv.status,
          version: cv.version,
          language: cv.language,
          downloadPdf: `/api/cv/${application.id}/pdf`,
          downloadDocx: `/api/cv/${application.id}/docx`,
        }
      : { exists: false },
    documents: application.documents.map((document) => ({
      id: document.id,
      name: document.name,
      category: document.category,
      mimeType: document.mimeType,
      url: `/api/documents/${document.id}`,
    })),
  };
}

export type PipelineStageOption = { key: string; label: string };

/** The pipeline stages the agent may move an opportunity to. */
export async function listPipelineStages(): Promise<PipelineStageOption[]> {
  const stages = await ensureApplicationPipelineStages();
  return stages.map((stage) => ({ key: stage.key, label: stage.label }));
}

/**
 * Resolves a status given either its stable key ("APPLIED") or its French label
 * ("Envoyée"), case-insensitively — so an agent can use whichever it has.
 */
async function resolveStage(raw: string) {
  const stages = await ensureApplicationPipelineStages();
  const needle = raw.trim().toLowerCase();
  const stage = stages.find((candidate) => candidate.key.toLowerCase() === needle || candidate.label.toLowerCase() === needle);
  if (!stage) {
    throw new Error(
      `Statut inconnu : "${raw}". Valeurs possibles : ${stages.map((s) => `${s.key} (${s.label})`).join(", ")}.`,
    );
  }
  return stage;
}

/** Moves an opportunity to another pipeline stage by key or label. */
export async function setApplicationStatus(applicationId: string, status: string) {
  const stage = await resolveStage(status);
  await updateApplicationStatus(applicationId, stage.id);
  await logMcpActivity("setApplicationStatus", { detail: JSON.stringify({ applicationId, status: stage.key }) });
  return { id: applicationId, statusKey: stage.key, statusLabel: stage.label };
}

/**
 * Marks an opportunity as "Envoyée": stamps appliedAt, schedules the follow-up
 * from the `followUpRuleDays` setting and records the activity — the exact same
 * path as the UI's one-click shortcut.
 */
export async function markSent(applicationId: string) {
  await markApplicationAsSent(applicationId);
  const application = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    select: { status: { select: { key: true, label: true } }, appliedAt: true, followUpAt: true, nextAction: true, nextActionDate: true },
  });
  await logMcpActivity("markSent", { detail: JSON.stringify({ applicationId }) });
  return {
    id: applicationId,
    statusKey: application.status.key,
    statusLabel: application.status.label,
    appliedAt: iso(application.appliedAt),
    followUpAt: iso(application.followUpAt),
    nextAction: application.nextAction,
    nextActionDate: iso(application.nextActionDate),
  };
}

export type ApplicationNoteInput = {
  note: string;
  nextAction?: string | null;
  nextActionDate?: string | null;
};

/** Appends a note to an opportunity's free-text notes and updates the next action. */
export async function appendNote(applicationId: string, input: ApplicationNoteInput) {
  const note = input.note.trim();
  if (!note) throw new Error("Note vide.");

  const existing = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    select: { notes: true },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const merged = [existing.notes?.trim(), `[${stamp}] ${note}`].filter(Boolean).join("\n\n");

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      notes: merged,
      ...(input.nextAction !== undefined ? { nextAction: input.nextAction?.trim() || null } : {}),
      ...(input.nextActionDate !== undefined
        ? { nextActionDate: input.nextActionDate ? new Date(input.nextActionDate) : null }
        : {}),
      lastInteractionAt: new Date(),
    },
  });

  await logActivity(applicationId, "NOTE", note.slice(0, 280));
  revalidatePath(`/opportunities/${applicationId}`);
  revalidatePath("/opportunities");
  await logMcpActivity("appendNote", { detail: JSON.stringify({ applicationId }) });
  return { id: applicationId, notes: merged };
}

/** Generates (or regenerates) the cover letter for one opportunity via the app's AI. */
export async function generateCoverLetterTool(
  applicationId: string,
  tone: CoverLetterTone,
  language: CoverLetterLanguage,
) {
  const { letter, usedAi } = await generateCoverLetterForApplication(applicationId, tone, language);
  await logMcpActivity("generateCoverLetter", { detail: JSON.stringify({ applicationId, tone, language, usedAi }) });
  return {
    id: applicationId,
    usedAi,
    tone,
    language,
    version: letter.version,
    status: letter.status,
    content: letter.content,
    downloadPdf: `/api/cover-letter/${applicationId}/pdf`,
    downloadDocx: `/api/cover-letter/${applicationId}/docx`,
  };
}

/** Generates (or regenerates) the opportunity-tailored CV via the app's AI. */
export async function generateCvTool(applicationId: string, language: CvLanguage) {
  const { cv, usedAi } = await generateCvForApplication(applicationId, language);
  await logMcpActivity("generateCv", { detail: JSON.stringify({ applicationId, language, usedAi }) });
  return {
    id: applicationId,
    usedAi,
    language,
    version: cv.version,
    status: cv.status,
    downloadPdf: `/api/cv/${applicationId}/pdf`,
    downloadDocx: `/api/cv/${applicationId}/docx`,
  };
}

/**
 * The candidate profile as an external form needs it: contact block, links,
 * education, languages and availability. Never includes the reference letter
 * or the raw CV text.
 */
export async function getCandidateProfile() {
  const profile = await getProfile();
  const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });
  await logMcpActivity("getCandidateProfile", {});
  return {
    fullName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null,
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    headline: profile.headline,
    summary: profile.summary,
    linkedinUrl: profile.linkedinUrl,
    githubUrl: profile.githubUrl,
    portfolioUrl: profile.portfolioUrl,
    educationLevel: profile.educationLevel,
    fieldOfStudy: profile.fieldOfStudy,
    graduationYear: profile.graduationYear,
    yearsOfExperience: profile.yearsOfExperience,
    educationHistory: profile.educationHistory,
    experiences: profile.experiences,
    projects: profile.projects,
    skills: profile.skills,
    languages: profile.languages,
    workAuthorization: profile.workAuthorization,
    availabilityNote: profile.availabilityNote,
    availabilityStart: iso(profile.availabilityStart),
    availabilityEnd: iso(profile.availabilityEnd),
    minDurationWeeks: profile.minDurationWeeks,
    maxDurationWeeks: profile.maxDurationWeeks,
    preferredCurrencies: safeJsonParse<string[]>(settings?.preferredCurrencies ?? null, []),
  };
}

/** Converts a staged Pistes lead into a tracked opportunity; returns its new id. */
export async function convertLeadTool(leadId: string) {
  const applicationId = await convertLead(leadId);
  await logMcpActivity("convertLead", { detail: JSON.stringify({ leadId, applicationId }) });
  return { leadId, applicationId };
}

/** Discards a staged Pistes lead without turning it into an opportunity. */
export async function discardLeadTool(leadId: string) {
  await discardLead(leadId);
  await logMcpActivity("discardLead", { detail: JSON.stringify({ leadId }) });
  return { leadId, status: "DISCARDED" as const };
}
