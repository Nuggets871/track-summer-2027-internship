"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { syncSource, syncAllSources } from "@/lib/discover/sync";
import { importJobsFromCsv, importJobsFromJson } from "@/lib/discover/import";
import { getProvider } from "@/lib/discover/providers/registry";
import { saveAnalyzedOpportunity } from "@/lib/actions/job-import";
import { extractJobPostingWithAI } from "@/lib/ai/prompts/job-extraction";
import { isAiConfigured } from "@/lib/ai/provider";
import { scoreListingFields } from "@/lib/discover/scoring";
import { safeJsonParse } from "@/lib/utils";
import { normalizeLanguageName } from "@/lib/job-extraction";
import { parseDiscoverQuery, type ParsedDiscoverQuery } from "@/lib/ai/prompts/discover-query-parser";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

function revalidateDiscover() {
  revalidatePath("/", "layout");
  revalidatePath("/discover");
}

// --- Sources ----------------------------------------------------------

const addSourceSchema = z.object({
  type: z.enum(["GREENHOUSE", "LEVER", "RSS", "JSON_ENDPOINT", "CSV_URL"]),
  name: z.string().min(1, "Le nom est requis"),
  config: z.record(z.string(), z.unknown()),
});

export async function addJobSource(raw: z.infer<typeof addSourceSchema>) {
  const data = addSourceSchema.parse(raw);

  // Fail fast with a clear message rather than saving a source that will
  // just error on its first sync.
  const provider = getProvider(data.type);
  const health = await provider.healthCheck(data.config);
  if (!health.ok) throw new Error(health.message);

  const source = await prisma.jobSource.create({
    data: {
      type: data.type,
      name: data.name,
      config: JSON.stringify(data.config),
      status: "OK",
    },
  });

  revalidateDiscover();
  revalidatePath("/settings");
  await syncSource(source);
  revalidateDiscover();
  revalidatePath("/settings");
  return source;
}

export async function toggleJobSource(id: string, enabled: boolean) {
  await prisma.jobSource.update({ where: { id }, data: { enabled } });
  revalidatePath("/settings");
}

export async function deleteJobSource(id: string) {
  await prisma.jobSource.delete({ where: { id } });
  revalidateDiscover();
  revalidatePath("/settings");
}

export async function syncOneSource(id: string) {
  const source = await prisma.jobSource.findUniqueOrThrow({ where: { id } });
  const result = await syncSource(source);
  revalidateDiscover();
  revalidatePath("/settings");
  return result;
}

export async function syncAllJobSources() {
  const results = await syncAllSources();
  revalidateDiscover();
  revalidatePath("/settings");
  return results;
}

// --- Manual import ------------------------------------------------------

export async function importDiscoverCsv(csvText: string) {
  const result = await importJobsFromCsv(csvText);
  revalidateDiscover();
  revalidatePath("/settings");
  return result;
}

export async function importDiscoverJson(jsonText: string) {
  const result = await importJobsFromJson(jsonText);
  revalidateDiscover();
  revalidatePath("/settings");
  return result;
}

// --- Saved searches -----------------------------------------------------

const savedSearchSchema = z.object({
  name: z.string().min(1),
  query: z.preprocess(emptyToNull, z.string().nullable().optional()),
  filters: z.record(z.string(), z.unknown()),
  sort: z.string().default("match"),
});

export async function createSavedSearch(raw: z.infer<typeof savedSearchSchema>) {
  const data = savedSearchSchema.parse(raw);
  const search = await prisma.savedSearch.create({
    data: { name: data.name, query: data.query, filters: JSON.stringify(data.filters), sort: data.sort },
  });
  revalidatePath("/discover");
  return search;
}

export async function deleteSavedSearch(id: string) {
  await prisma.savedSearch.delete({ where: { id } });
  revalidatePath("/discover");
}

// --- Watchlist ------------------------------------------------------------

const watchSchema = z.object({
  keyword: z.preprocess(emptyToNull, z.string().nullable().optional()),
  countryName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  cityName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  sector: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export async function createJobWatch(raw: z.infer<typeof watchSchema>) {
  const data = watchSchema.parse(raw);
  if (!data.keyword && !data.countryName && !data.cityName && !data.sector) {
    throw new Error("Renseigne au moins un critère (mot-clé, pays, ville ou secteur).");
  }
  const watch = await prisma.jobWatch.create({ data });
  revalidatePath("/discover");
  return watch;
}

export async function deleteJobWatch(id: string) {
  await prisma.jobWatch.delete({ where: { id } });
  revalidatePath("/discover");
}

export async function markWatchNotified(id: string) {
  await prisma.jobWatch.update({ where: { id }, data: { lastNotifiedAt: new Date() } });
  revalidatePath("/discover");
}

// --- Save a listing as an Opportunity -------------------------------------

/**
 * Turns a Discover listing into a tracked Opportunity, reusing the exact
 * same save path as the "paste a link" workflow (saveAnalyzedOpportunity) so
 * both entry points end up in the identical, single source of truth. Never
 * creates a second Opportunity for a listing (or URL) already tracked.
 */
export async function convertListingToOpportunity(listingId: string, action: "SAVE_LATER" | "ALREADY_APPLIED" | "PREPARE") {
  const listing = await prisma.jobListing.findUniqueOrThrow({ where: { id: listingId } });

  if (listing.linkedApplicationId) {
    const existing = await prisma.application.findUnique({ where: { id: listing.linkedApplicationId } });
    if (existing) return existing;
  }

  const byUrl = await prisma.application.findFirst({ where: { jobUrl: listing.sourceUrl } });
  if (byUrl) {
    await prisma.jobListing.update({ where: { id: listing.id }, data: { linkedApplicationId: byUrl.id } });
    revalidateDiscover();
    return byUrl;
  }

  const application = await saveAnalyzedOpportunity({
    action,
    title: listing.title,
    companyName: listing.companyName,
    countryName: listing.countryName,
    city: listing.cityName,
    remoteType: (listing.remoteType as "REMOTE" | "HYBRID" | "ONSITE" | null) ?? null,
    jobUrl: listing.sourceUrl,
    source: `Discover — ${listing.companyName}`,
    salaryAmount: listing.salaryAmount,
    salaryCurrency: listing.salaryCurrency ?? "EUR",
    durationMonths: listing.durationMonths,
    startDate: listing.startDate,
    deadline: listing.expiresAt,
    notes: null,
    appliedAt: action === "ALREADY_APPLIED" ? new Date() : null,
    nextAction: null,
    analysis: {
      sourceUrl: listing.sourceUrl,
      extractionMethod: listing.aiEnhanced ? "AI_ENHANCED" : "HEURISTIC",
      rawExtractedText: listing.rawText ?? listing.description ?? listing.title,
      responsibilities: null,
      qualifications: listing.description,
      requiredSkills: safeJsonParse<string[]>(listing.requiredSkills, []),
      requiredLanguages: safeJsonParse<string[]>(listing.requiredLanguages, []),
      requiredEducationLevel: listing.requiredEducationLevel,
      requiredExperienceYears: listing.requiredExperienceYears,
      contractType: listing.contractType,
      matchScore: listing.matchScore ?? 0,
      matchBreakdown: safeJsonParse<Record<string, unknown>[]>(listing.matchBreakdown, []),
      strengths: safeJsonParse<string[]>(listing.strengths, []),
      watchouts: safeJsonParse<string[]>(listing.watchouts, []),
      missingSkills: safeJsonParse<string[]>(listing.missingSkills, []),
      recommendation: listing.recommendation ?? "",
      eligibilityStatus: listing.eligibilityStatus ?? "UNCLEAR",
      eligibilityNotes: safeJsonParse<string[]>(listing.eligibilityNotes, []),
    },
  });

  await prisma.jobListing.update({ where: { id: listing.id }, data: { linkedApplicationId: application.id } });
  revalidateDiscover();
  return application;
}

// --- On-demand AI-enhanced extraction (Step 2) ----------------------------

/**
 * Deepens a listing's structured data using AI extraction on its raw text
 * — the same extractJobPostingWithAI already used by "paste a link" — then
 * recomputes the (still fully deterministic) local Match Score against the
 * enriched fields. Only ever called for a listing the user actually opened,
 * never in bulk across the whole database.
 */
export async function analyzeListingWithAi(listingId: string) {
  if (!(await isAiConfigured())) {
    throw new Error("Configure une clé DeepSeek dans Paramètres > IA pour analyser cette offre avec l'IA.");
  }
  const listing = await prisma.jobListing.findUniqueOrThrow({ where: { id: listingId } });
  const text = listing.rawText ?? listing.description ?? listing.title;
  const ai = await extractJobPostingWithAI(text);
  if (!ai) throw new Error("L'IA n'a pas pu analyser cette offre.");

  const requiredSkills = Array.from(
    new Set([...safeJsonParse<string[]>(listing.requiredSkills, []), ...(ai.requiredSkills ?? [])]),
  );
  const requiredLanguages = Array.from(
    new Set([
      ...safeJsonParse<string[]>(listing.requiredLanguages, []),
      ...(ai.requiredLanguages ?? []).map(normalizeLanguageName),
    ]),
  );

  const updateData = {
    requiredSkills: JSON.stringify(requiredSkills),
    requiredLanguages: JSON.stringify(requiredLanguages),
    requiredEducationLevel: listing.requiredEducationLevel ?? ai.requiredEducationLevel ?? null,
    requiredExperienceYears: listing.requiredExperienceYears ?? ai.requiredExperienceYears ?? null,
    salaryAmount: listing.salaryAmount ?? ai.salaryAmount ?? null,
    salaryCurrency: listing.salaryCurrency ?? ai.salaryCurrency ?? null,
    durationMonths: listing.durationMonths ?? ai.durationMonths ?? null,
    contractType: listing.contractType ?? ai.contractType ?? null,
    aiEnhanced: true,
    aiAnalyzedAt: new Date(),
  };

  const scoreFields = await scoreListingFields({
    title: listing.title,
    requiredSkills: updateData.requiredSkills,
    requiredLanguages: updateData.requiredLanguages,
    requiredEducationLevel: updateData.requiredEducationLevel,
    requiredExperienceYears: updateData.requiredExperienceYears,
    countryName: listing.countryName,
    remoteType: listing.remoteType,
    sector: listing.sector,
    rawText: listing.rawText,
  });

  await prisma.jobListing.update({ where: { id: listingId }, data: { ...updateData, ...scoreFields } });
  revalidateDiscover();
}

// --- Natural-language search --------------------------------------------

/**
 * Understands a free-text query well enough to turn it into filters, then
 * hands off to the real search over listings already in the database — the
 * AI never produces or invents a job result itself.
 */
export async function parseNlSearchQuery(query: string): Promise<ParsedDiscoverQuery | null> {
  if (!(await isAiConfigured())) return null;
  return parseDiscoverQuery(query);
}
