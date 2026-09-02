// The sync orchestrator — the only place that ties fetch (provider) →
// normalize → classify → dedup → score → persist → index together. One
// broken source must never affect another: every step here is scoped to a
// single JobSource and wrapped so a thrown error becomes a stored
// `lastSyncError` instead of crashing the whole "Sync all" run.

import { prisma } from "@/lib/prisma";
import type { JobSource } from "@prisma/client";
import { getProvider } from "@/lib/discover/providers/registry";
import { normalizeRawJob } from "@/lib/discover/normalize";
import { findDuplicatePrimary } from "@/lib/discover/dedup";
import { scoreListingFields } from "@/lib/discover/scoring";
import { upsertFtsRow, deleteFtsRow } from "@/lib/discover/search-index";
import { looksLikeInternship } from "@/lib/discover/classify";
import type { NormalizedJob, RawSourceJob } from "@/lib/discover/types";
import { safeJsonParse } from "@/lib/utils";

export type SyncResult = {
  sourceId: string;
  ok: boolean;
  message: string;
  created: number;
  updated: number;
  expired: number;
};

/** Ingests one already-normalized job — shared by provider-driven sync and
 * one-off CSV/JSON import, since both need the exact same dedup/score/index
 * pipeline. Returns "created" | "updated" | "duplicate" (merged into an
 * existing primary listing from another source). */
export async function ingestNormalizedJob(sourceId: string, job: NormalizedJob): Promise<"created" | "updated" | "duplicate"> {
  const existing = await prisma.jobListing.findUnique({
    where: { sourceId_sourceJobId: { sourceId, sourceJobId: job.sourceJobId } },
  });

  const scoreFields = await scoreListingFields({
    title: job.title,
    requiredSkills: JSON.stringify(job.requiredSkills),
    requiredLanguages: JSON.stringify(job.requiredLanguages),
    requiredEducationLevel: job.requiredEducationLevel,
    requiredExperienceYears: job.requiredExperienceYears,
    countryName: job.countryName,
    remoteType: job.remoteType,
    sector: job.sector,
    rawText: job.rawText,
  });

  const baseData = {
    sourceUrl: job.sourceUrl,
    title: job.title,
    companyName: job.companyName,
    description: job.description,
    rawText: job.rawText,
    cityName: job.cityName,
    countryName: job.countryName,
    remoteType: job.remoteType,
    sector: job.sector,
    contractType: job.contractType,
    isInternship: job.isInternship,
    postedAt: job.postedAt,
    durationMonths: job.durationMonths,
    salaryAmount: job.salaryAmount,
    salaryCurrency: job.salaryCurrency,
    requiredEducationLevel: job.requiredEducationLevel,
    requiredExperienceYears: job.requiredExperienceYears,
    requiredSkills: JSON.stringify(job.requiredSkills),
    requiredLanguages: JSON.stringify(job.requiredLanguages),
    visaSponsorship: job.visaSponsorship,
    tags: JSON.stringify(job.tags),
    status: "ACTIVE",
    ...scoreFields,
  };

  let listingId: string;
  let outcome: "created" | "updated";

  if (existing) {
    await prisma.jobListing.update({ where: { id: existing.id }, data: baseData });
    listingId = existing.id;
    outcome = "updated";
  } else {
    const created = await prisma.jobListing.create({ data: { sourceId, sourceJobId: job.sourceJobId, ...baseData } });
    listingId = created.id;
    outcome = "created";
  }

  // Cross-source dedup: only meaningful for newly-created rows (an update
  // is already linked to whatever it was deduped against on creation).
  if (outcome === "created") {
    const primary = await findDuplicatePrimary(
      { sourceUrl: job.sourceUrl, companyName: job.companyName, title: job.title, countryName: job.countryName, cityName: job.cityName },
      sourceId,
    );
    if (primary) {
      await prisma.$transaction([
        prisma.jobListing.update({ where: { id: listingId }, data: { duplicateOfId: primary.id } }),
        prisma.jobListing.update({ where: { id: primary.id }, data: { foundSourcesCount: { increment: 1 } } }),
      ]);
      // A duplicate isn't independently searchable — only the primary is.
      await deleteFtsRow(listingId);
      return "duplicate";
    }
  }

  await upsertFtsRow({
    id: listingId,
    title: job.title,
    companyName: job.companyName,
    description: job.description,
    cityName: job.cityName,
    countryName: job.countryName,
    sector: job.sector,
    requiredSkills: baseData.requiredSkills,
    tags: baseData.tags,
  });

  return outcome;
}

async function ingestRawJobs(sourceId: string, rawJobs: RawSourceJob[]): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  for (const raw of rawJobs) {
    const normalized = normalizeRawJob(raw);
    const outcome = await ingestNormalizedJob(sourceId, normalized);
    if (outcome === "created") created += 1;
    else if (outcome === "updated") updated += 1;
  }
  return { created, updated };
}

/** Marks listings from this source that were active before this sync but
 * didn't appear in the fresh fetch as EXPIRED — never deleted, so their
 * history (and any linked Opportunity) survives. */
async function markMissingAsExpired(sourceId: string, seenSourceJobIds: Set<string>): Promise<number> {
  const stillActive = await prisma.jobListing.findMany({
    where: { sourceId, status: "ACTIVE" },
    select: { id: true, sourceJobId: true },
  });
  const missingIds = stillActive.filter((l) => !seenSourceJobIds.has(l.sourceJobId)).map((l) => l.id);
  if (missingIds.length === 0) return 0;
  await prisma.jobListing.updateMany({ where: { id: { in: missingIds } }, data: { status: "EXPIRED" } });
  return missingIds.length;
}

/** Company-board sources (Greenhouse/Lever) list every open role, not just
 * internships — keep only what looks like one. Manual/CSV/JSON imports are
 * trusted as already curated by the user and kept as-is. */
function keepOnlyInternships(sourceType: string, jobs: RawSourceJob[]): RawSourceJob[] {
  if (sourceType !== "GREENHOUSE" && sourceType !== "LEVER") return jobs;
  return jobs.filter((j) => looksLikeInternship(j.title, j.departmentOrTeam));
}

export async function syncSource(source: JobSource): Promise<SyncResult> {
  const config = safeJsonParse<Record<string, unknown>>(source.config, {});

  try {
    const provider = getProvider(source.type);
    const rawJobs = await provider.searchJobs(config);
    const filtered = keepOnlyInternships(source.type, rawJobs);

    const { created, updated } = await ingestRawJobs(source.id, filtered);
    const expired = await markMissingAsExpired(source.id, new Set(filtered.map((j) => j.sourceJobId)));

    const jobCount = await prisma.jobListing.count({ where: { sourceId: source.id, status: "ACTIVE" } });

    await prisma.jobSource.update({
      where: { id: source.id },
      data: { status: "OK", lastSyncedAt: new Date(), lastSyncError: null, jobCount },
    });

    return {
      sourceId: source.id,
      ok: true,
      message: `${created} nouvelle(s), ${updated} mise(s) à jour, ${expired} expirée(s).`,
      created,
      updated,
      expired,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue lors de la synchronisation.";
    await prisma.jobSource.update({
      where: { id: source.id },
      data: { status: "ERROR", lastSyncedAt: new Date(), lastSyncError: message },
    });
    return { sourceId: source.id, ok: false, message, created: 0, updated: 0, expired: 0 };
  }
}

/** Syncs every enabled source, independently — one failure is recorded on
 * that source and never stops the others. */
export async function syncAllSources(): Promise<SyncResult[]> {
  const sources = await prisma.jobSource.findMany({ where: { enabled: true } });
  const results: SyncResult[] = [];
  for (const source of sources) {
    results.push(await syncSource(source));
  }
  return results;
}
