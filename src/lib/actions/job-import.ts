"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { extractJobPostingFromHtml, extractJobPostingFromText, normalizeLanguageName, type ExtractedJobData } from "@/lib/job-extraction";
import { extractJobPostingWithAI } from "@/lib/ai/prompts/job-extraction";
import { isAiConfigured } from "@/lib/ai/provider";
import { computeJobMatch, computeEligibility, type MatchResult, type EligibilityResult } from "@/lib/job-matching";
import { getProfile } from "@/lib/data/profile";
import { getSettings } from "@/lib/data/settings";
import { ensureApplicationPipelineStages } from "@/lib/data/pipeline-stages";
const FETCH_TIMEOUT_MS = 12_000;

export type DuplicateMatch = { id: string; title: string; companyName: string } | null;

export type JobAnalysisPayload = {
  extracted: ExtractedJobData;
  match: MatchResult;
  eligibility: EligibilityResult;
  duplicate: DuplicateMatch;
  aiUsed: boolean;
};

export type AnalyzeOutcome = { ok: true; data: JobAnalysisPayload } | { ok: false; reason: "FETCH_FAILED" | "EMPTY_CONTENT" };

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function findDuplicate(url: string | null, companyName: string | null, title: string | null): Promise<DuplicateMatch> {
  if (url) {
    const exact = await prisma.application.findFirst({
      where: { jobUrl: url },
      include: { company: true },
    });
    if (exact) return { id: exact.id, title: exact.title, companyName: exact.company.name };
  }
  if (companyName && title) {
    const fuzzy = await prisma.application.findFirst({
      where: {
        title: { contains: title },
        company: { name: { contains: companyName } },
      },
      include: { company: true },
    });
    if (fuzzy) return { id: fuzzy.id, title: fuzzy.title, companyName: fuzzy.company.name };
  }
  return null;
}

/** Merges AI extraction into the heuristic/structured baseline: the AI only
 * fills gaps (or adds new skills/languages) — it never overrides fields the
 * baseline already found with confidence (e.g. a schema.org salary). */
function mergeAiIntoBaseline(baseline: ExtractedJobData, ai: Awaited<ReturnType<typeof extractJobPostingWithAI>>): ExtractedJobData {
  if (!ai) return baseline;
  const merged: ExtractedJobData = { ...baseline, extractionMethod: "AI_ENHANCED" };
  const fillIfEmpty = <K extends keyof ExtractedJobData>(key: K, value: ExtractedJobData[K] | undefined | null) => {
    if ((merged[key] === null || merged[key] === undefined) && value !== undefined && value !== null) {
      merged[key] = value;
    }
  };
  fillIfEmpty("title", ai.title);
  fillIfEmpty("companyName", ai.companyName);
  fillIfEmpty("city", ai.city);
  fillIfEmpty("countryName", ai.countryName);
  fillIfEmpty("remoteType", ai.remoteType);
  fillIfEmpty("responsibilities", ai.responsibilities);
  fillIfEmpty("qualifications", ai.qualifications);
  fillIfEmpty("requiredEducationLevel", ai.requiredEducationLevel);
  fillIfEmpty("requiredExperienceYears", ai.requiredExperienceYears);
  fillIfEmpty("salaryAmount", ai.salaryAmount);
  fillIfEmpty("salaryCurrency", ai.salaryCurrency);
  fillIfEmpty("durationMonths", ai.durationMonths);
  fillIfEmpty("startDate", ai.startDate);
  fillIfEmpty("deadline", ai.deadline);
  fillIfEmpty("contractType", ai.contractType);
  if (ai.requiredSkills?.length) {
    merged.requiredSkills = dedupeCaseInsensitive([...merged.requiredSkills, ...ai.requiredSkills]);
  }
  if (ai.requiredLanguages?.length) {
    const normalized = ai.requiredLanguages.map(normalizeLanguageName);
    merged.requiredLanguages = dedupeCaseInsensitive([...merged.requiredLanguages, ...normalized]);
  }
  return merged;
}

/** Case-insensitive de-duplication that keeps the first-seen casing (the
 * heuristic/baseline extraction runs first, so its canonical casing wins
 * over whatever variant the AI happens to return for the same skill). */
function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

async function runMatchAndEligibility(extracted: ExtractedJobData) {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const jobForMatching = {
    requiredSkills: extracted.requiredSkills,
    requiredLanguages: extracted.requiredLanguages,
    requiredEducationLevel: extracted.requiredEducationLevel,
    requiredExperienceYears: extracted.requiredExperienceYears,
    countryName: extracted.countryName,
    remoteType: extracted.remoteType,
    sector: null,
    rawText: extracted.rawText,
  };
  const match = computeJobMatch(profile, jobForMatching, settings.matchWeights, {
    preferredCountries: settings.preferredCountries,
    preferredSectors: settings.preferredSectors,
  });
  const eligibility = computeEligibility(profile, jobForMatching);
  return { match, eligibility };
}

export async function analyzeJobUrl(url: string): Promise<AnalyzeOutcome> {
  const html = await fetchHtml(url);
  if (!html || html.trim().length < 200) {
    return { ok: false, reason: "FETCH_FAILED" };
  }

  let extracted = extractJobPostingFromHtml(html);
  let aiUsed = false;
  if (await isAiConfigured()) {
    const ai = await extractJobPostingWithAI(extracted.rawText);
    if (ai) {
      extracted = mergeAiIntoBaseline(extracted, ai);
      aiUsed = true;
    }
  }
  if (!extracted.title && !extracted.companyName && !extracted.description) {
    return { ok: false, reason: "EMPTY_CONTENT" };
  }

  const duplicate = await findDuplicate(url, extracted.companyName, extracted.title);
  const { match, eligibility } = await runMatchAndEligibility(extracted);

  return { ok: true, data: { extracted, match, eligibility, duplicate, aiUsed } };
}

export async function analyzeJobText(pastedText: string, url?: string): Promise<AnalyzeOutcome> {
  if (!pastedText.trim() || pastedText.trim().length < 50) {
    return { ok: false, reason: "EMPTY_CONTENT" };
  }

  let extracted = extractJobPostingFromText(pastedText);
  let aiUsed = false;
  if (await isAiConfigured()) {
    const ai = await extractJobPostingWithAI(extracted.rawText);
    if (ai) {
      extracted = mergeAiIntoBaseline(extracted, ai);
      aiUsed = true;
    }
  }

  const duplicate = await findDuplicate(url ?? null, extracted.companyName, extracted.title);
  const { match, eligibility } = await runMatchAndEligibility(extracted);

  return { ok: true, data: { extracted, match, eligibility, duplicate, aiUsed } };
}

// --- Saving the reviewed opportunity ---------------------------------------

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const saveOpportunitySchema = z.object({
  action: z.enum(["SAVE_LATER", "ALREADY_APPLIED", "PREPARE"]),
  title: z.string().min(1),
  companyName: z.string().min(1),
  countryName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().nullable().optional()),
  remoteType: z.preprocess(emptyToNull, z.enum(["REMOTE", "HYBRID", "ONSITE"]).nullable().optional()),
  jobUrl: z.preprocess(emptyToNull, z.string().nullable().optional()),
  source: z.preprocess(emptyToNull, z.string().nullable().optional()),
  salaryAmount: z.preprocess(emptyToNull, z.coerce.number().nullable().optional()),
  salaryCurrency: z.string().default("EUR"),
  durationMonths: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  startDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  deadline: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  // "already applied" extras
  appliedAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  nextAction: z.preprocess(emptyToNull, z.string().nullable().optional()),
  // analysis snapshot to persist alongside the application
  analysis: z.object({
    sourceUrl: z.preprocess(emptyToNull, z.string().nullable().optional()),
    extractionMethod: z.string(),
    rawExtractedText: z.string(),
    responsibilities: z.preprocess(emptyToNull, z.string().nullable().optional()),
    qualifications: z.preprocess(emptyToNull, z.string().nullable().optional()),
    requiredSkills: z.array(z.string()).default([]),
    requiredLanguages: z.array(z.string()).default([]),
    requiredEducationLevel: z.preprocess(emptyToNull, z.string().nullable().optional()),
    requiredExperienceYears: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
    contractType: z.preprocess(emptyToNull, z.string().nullable().optional()),
    matchScore: z.number(),
    matchBreakdown: z.array(z.record(z.string(), z.unknown())),
    strengths: z.array(z.string()),
    watchouts: z.array(z.string()),
    missingSkills: z.array(z.string()),
    recommendation: z.string(),
    eligibilityStatus: z.string(),
    eligibilityNotes: z.array(z.string()),
  }),
});

export type SaveOpportunityInput = z.infer<typeof saveOpportunitySchema>;

export async function saveAnalyzedOpportunity(raw: SaveOpportunityInput) {
  const data = saveOpportunitySchema.parse(raw);

  // Company.name has no unique constraint in the schema (deliberately, to
  // allow same-named companies in different contexts), so find-or-create
  // rather than upsert.
  const company =
    (await prisma.company.findFirst({ where: { name: data.companyName } })) ??
    (await prisma.company.create({ data: { name: data.companyName } }));

  let countryId: string | undefined;
  if (data.countryName) {
    const country = await prisma.country.upsert({
      where: { name: data.countryName },
      create: { name: data.countryName },
      update: {},
    });
    countryId = country.id;
  }

  let cityId: string | undefined;
  if (data.city && countryId) {
    const city = await prisma.city.upsert({
      where: { name_countryId: { name: data.city, countryId } },
      create: { name: data.city, countryId },
      update: {},
    });
    cityId = city.id;
  }

  const stages = await ensureApplicationPipelineStages();
  const stageKey = data.action === "ALREADY_APPLIED" ? "APPLIED" : data.action === "PREPARE" ? "PREPARING" : "SAVED";
  const stage = stages.find((s) => s.key === stageKey);
  if (!stage) throw new Error(`Statut de candidature introuvable : ${stageKey}`);

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        title: data.title,
        companyId: company.id,
        countryId,
        cityId,
        remotePossible: data.remoteType === "REMOTE",
        jobUrl: data.jobUrl,
        source: data.source ?? "Lien d'offre",
        discoveredAt: new Date(),
        appliedAt: data.action === "ALREADY_APPLIED" ? (data.appliedAt ?? new Date()) : null,
        deadline: data.deadline ?? null,
        potentialStartDate: data.startDate ?? null,
        durationMonths: data.durationMonths,
        salaryAmount: data.salaryAmount,
        salaryCurrency: data.salaryCurrency,
        statusId: stage.id,
        nextAction: data.action === "ALREADY_APPLIED" ? (data.nextAction ?? null) : null,
        notes: data.notes,
      },
    });

    await tx.jobAnalysis.create({
      data: {
        applicationId: created.id,
        sourceUrl: data.analysis.sourceUrl,
        extractionMethod: data.analysis.extractionMethod,
        rawExtractedText: data.analysis.rawExtractedText.slice(0, 8000),
        responsibilities: data.analysis.responsibilities,
        qualifications: data.analysis.qualifications,
        requiredSkills: JSON.stringify(data.analysis.requiredSkills),
        requiredLanguages: JSON.stringify(data.analysis.requiredLanguages),
        requiredEducationLevel: data.analysis.requiredEducationLevel,
        requiredExperienceYears: data.analysis.requiredExperienceYears,
        contractType: data.analysis.contractType,
        matchScore: Math.round(data.analysis.matchScore),
        matchBreakdown: JSON.stringify(data.analysis.matchBreakdown),
        strengths: JSON.stringify(data.analysis.strengths),
        watchouts: JSON.stringify(data.analysis.watchouts),
        missingSkills: JSON.stringify(data.analysis.missingSkills),
        recommendation: data.analysis.recommendation,
        eligibilityStatus: data.analysis.eligibilityStatus,
        eligibilityNotes: JSON.stringify(data.analysis.eligibilityNotes),
        profileUpdatedAtSnapshot: new Date(),
      },
    });

    return created;
  });

  revalidatePath("/", "layout");
  revalidatePath("/opportunities");
  return application;
}

export async function recalculateJobMatch(applicationId: string) {
  const analysis = await prisma.jobAnalysis.findUniqueOrThrow({ where: { applicationId } });

  const extracted: Pick<
    ExtractedJobData,
    "requiredSkills" | "requiredLanguages" | "requiredEducationLevel" | "requiredExperienceYears" | "rawText"
  > = {
    requiredSkills: JSON.parse(analysis.requiredSkills ?? "[]"),
    requiredLanguages: JSON.parse(analysis.requiredLanguages ?? "[]"),
    requiredEducationLevel: analysis.requiredEducationLevel,
    requiredExperienceYears: analysis.requiredExperienceYears,
    rawText: analysis.rawExtractedText ?? "",
  };

  const [profile, settings, application] = await Promise.all([
    getProfile(),
    getSettings(),
    prisma.application.findUniqueOrThrow({ where: { id: applicationId }, include: { country: true } }),
  ]);

  const jobForMatching = {
    ...extracted,
    countryName: application.country?.name ?? null,
    remoteType: (application.remotePossible ? "REMOTE" : null) as "REMOTE" | null,
    sector: application.sector,
  };

  const match = computeJobMatch(profile, jobForMatching, settings.matchWeights, {
    preferredCountries: settings.preferredCountries,
    preferredSectors: settings.preferredSectors,
  });
  const eligibility = computeEligibility(profile, jobForMatching);

  await prisma.jobAnalysis.update({
    where: { applicationId },
    data: {
      matchScore: match.total,
      matchBreakdown: JSON.stringify(match.factors),
      strengths: JSON.stringify(match.strengths),
      watchouts: JSON.stringify(match.watchouts),
      missingSkills: JSON.stringify(match.missingSkills),
      recommendation: match.recommendation,
      eligibilityStatus: eligibility.status,
      eligibilityNotes: JSON.stringify(eligibility.notes),
      analyzedAt: new Date(),
      profileUpdatedAtSnapshot: profile.updatedAt,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath(`/opportunities/${applicationId}`);
  revalidatePath("/opportunities");
  return { match, eligibility };
}

/**
 * "Analyze again" (AI Actions): re-fetches the original posting (or reuses
 * the previously extracted text if there's no URL or the page can no longer
 * be fetched) and fully re-runs extraction + match + eligibility, updating
 * the existing JobAnalysis in place. Unlike recalculateJobMatch (score-only,
 * cheap), this re-does the extraction itself — useful when a listing has
 * been edited since it was first imported.
 */
export async function reanalyzeOpportunity(applicationId: string) {
  const existing = await prisma.jobAnalysis.findUniqueOrThrow({ where: { applicationId } });

  let extracted: ExtractedJobData;
  const html = existing.sourceUrl ? await fetchHtml(existing.sourceUrl) : null;
  if (html && html.trim().length >= 200) {
    extracted = extractJobPostingFromHtml(html);
  } else {
    extracted = extractJobPostingFromText(existing.rawExtractedText ?? "");
  }

  if (await isAiConfigured()) {
    const ai = await extractJobPostingWithAI(extracted.rawText);
    if (ai) extracted = mergeAiIntoBaseline(extracted, ai);
  }

  const { match, eligibility } = await runMatchAndEligibility(extracted);

  await prisma.jobAnalysis.update({
    where: { applicationId },
    data: {
      extractionMethod: extracted.extractionMethod,
      rawExtractedText: extracted.rawText.slice(0, 8000),
      responsibilities: extracted.responsibilities,
      qualifications: extracted.qualifications,
      requiredSkills: JSON.stringify(extracted.requiredSkills),
      requiredLanguages: JSON.stringify(extracted.requiredLanguages),
      requiredEducationLevel: extracted.requiredEducationLevel,
      requiredExperienceYears: extracted.requiredExperienceYears,
      contractType: extracted.contractType,
      matchScore: match.total,
      matchBreakdown: JSON.stringify(match.factors),
      strengths: JSON.stringify(match.strengths),
      watchouts: JSON.stringify(match.watchouts),
      missingSkills: JSON.stringify(match.missingSkills),
      recommendation: match.recommendation,
      eligibilityStatus: eligibility.status,
      eligibilityNotes: JSON.stringify(eligibility.notes),
      analyzedAt: new Date(),
    },
  });

  revalidatePath("/", "layout");
  revalidatePath(`/opportunities/${applicationId}`);
  return { match, eligibility };
}
