// Deduplication across sources — the same internship often shows up on a
// company's Greenhouse board AND in an RSS feed AND in a manually-imported
// list. Two real, cheap signals (no embeddings, no AI, so this stays free
// and instant even at thousands of listings):
//
// 1. Canonical URL match — the strongest signal when it's available.
// 2. Normalized company + title (+ location, when both sides have one) —
//    catches the same posting reached through different links.
//
// Full description-similarity matching would need an embedding model to do
// well; skipping it is a deliberate choice to keep dedup instant and free
// rather than pretending to offer semantic matching it doesn't have.

import { prisma } from "@/lib/prisma";

export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname.toLowerCase()}${path.toLowerCase()}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

export function normalizeForDedup(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics (é -> e, etc.)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export type DedupCandidate = {
  id: string;
  sourceUrl: string;
  companyName: string;
  title: string;
  countryName: string | null;
  cityName: string | null;
};

/** Finds the existing primary listing (not itself a duplicate) that `job`
 * should be merged into, among listings NOT from the same source (same-
 * source repeats are handled by the sourceId+sourceJobId unique constraint
 * instead). Returns null when nothing matches — `job` becomes its own
 * primary. */
export async function findDuplicatePrimary(
  job: { sourceUrl: string; companyName: string; title: string; countryName: string | null; cityName: string | null },
  excludeSourceId: string,
): Promise<DedupCandidate | null> {
  const canonicalUrl = canonicalizeUrl(job.sourceUrl);

  // Only compare against listings not already excluded as duplicates of
  // something else, and from other sources — a bounded, indexed query even
  // with tens of thousands of rows since it's scoped to the same company.
  const candidates = await prisma.jobListing.findMany({
    where: {
      sourceId: { not: excludeSourceId },
      duplicateOfId: null,
      companyName: { equals: job.companyName },
    },
    select: { id: true, sourceUrl: true, companyName: true, title: true, countryName: true, cityName: true },
    take: 200,
  });

  const normalizedTitle = normalizeForDedup(job.title);

  for (const candidate of candidates) {
    if (canonicalizeUrl(candidate.sourceUrl) === canonicalUrl) return candidate;
  }

  for (const candidate of candidates) {
    const sameTitle = normalizeForDedup(candidate.title) === normalizedTitle;
    if (!sameTitle) continue;
    const sameLocation =
      (!job.countryName && !candidate.countryName) ||
      (job.countryName && candidate.countryName && normalizeForDedup(job.countryName) === normalizeForDedup(candidate.countryName));
    if (sameLocation) return candidate;
  }

  return null;
}
