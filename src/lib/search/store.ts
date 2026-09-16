import { prisma } from "@/lib/prisma";
import type { NormalizedSearchJob } from "@/lib/search/types";

export function periodKeyFor(period: "day" | "month"): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return period === "day" ? `${year}-${month}-${String(now.getUTCDate()).padStart(2, "0")}` : `${year}-${month}`;
}

export async function getUsage(providerId: string, periodKey: string): Promise<number> {
  const row = await prisma.providerUsage.findUnique({ where: { providerId_periodKey: { providerId, periodKey } } });
  return row?.count ?? 0;
}

export async function incrementUsage(providerId: string, periodKey: string): Promise<void> {
  await prisma.providerUsage.upsert({
    where: { providerId_periodKey: { providerId, periodKey } },
    create: { providerId, periodKey, count: 1 },
    update: { count: { increment: 1 } },
  });
}

/** Cached provider response, or null when absent/expired. */
export async function getCachedJobs(key: string, ttlSeconds: number): Promise<NormalizedSearchJob[] | null> {
  const row = await prisma.searchQueryCache.findUnique({ where: { key } });
  if (!row) return null;
  if (Date.now() - row.fetchedAt.getTime() > ttlSeconds * 1000) return null;
  try {
    return JSON.parse(row.payload) as NormalizedSearchJob[];
  } catch {
    return null;
  }
}

export async function saveCachedJobs(key: string, providerId: string, jobs: NormalizedSearchJob[]): Promise<void> {
  const payload = JSON.stringify(jobs);
  await prisma.searchQueryCache.upsert({
    where: { key },
    create: { key, providerId, payload },
    update: { providerId, payload, fetchedAt: new Date() },
  });
}

export type PersistInput = {
  canonicalUrl: string;
  job: NormalizedSearchJob;
  matchScore: number | null;
  matchLabel: string;
  eligibilityStatus: string | null;
};

/**
 * Upserts every discovered job into the long-term memory. Returns the set of
 * canonical URLs that were NOT known before this run (the "new" ones).
 * Never un-dismisses a job the user hid.
 */
export async function persistDiscovered(items: PersistInput[]): Promise<Set<string>> {
  if (items.length === 0) return new Set();
  const urls = items.map((item) => item.canonicalUrl);
  const known = new Set(
    (await prisma.discoveredJob.findMany({ where: { canonicalUrl: { in: urls } }, select: { canonicalUrl: true } })).map(
      (row) => row.canonicalUrl,
    ),
  );
  const now = new Date();

  await prisma.$transaction(
    items.map((item) =>
      prisma.discoveredJob.upsert({
        where: { canonicalUrl: item.canonicalUrl },
        create: {
          canonicalUrl: item.canonicalUrl,
          url: item.job.url,
          providerId: item.job.providerId,
          source: item.job.source,
          sourceJobId: item.job.id,
          title: item.job.title,
          company: item.job.company,
          city: item.job.city,
          country: item.job.country,
          remoteType: item.job.remoteType,
          salaryAmount: item.job.salaryAmount,
          salaryCurrency: item.job.salaryCurrency,
          employmentType: item.job.employmentType,
          postedAt: item.job.postedAt ? new Date(item.job.postedAt) : null,
          description: item.job.description,
          matchScore: item.matchScore,
          matchLabel: item.matchLabel,
          eligibilityStatus: item.eligibilityStatus,
          firstSeenAt: now,
          lastSeenAt: now,
        },
        update: {
          lastSeenAt: now,
          matchScore: item.matchScore,
          matchLabel: item.matchLabel,
          eligibilityStatus: item.eligibilityStatus,
          ...(item.job.description ? { description: item.job.description } : {}),
        },
      }),
    ),
  );

  return new Set(urls.filter((url) => !known.has(url)));
}

export async function getDismissedUrls(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const rows = await prisma.discoveredJob.findMany({
    where: { canonicalUrl: { in: urls }, dismissed: true },
    select: { canonicalUrl: true },
  });
  return new Set(rows.map((row) => row.canonicalUrl));
}

export async function setDismissed(canonicalUrl: string, dismissed: boolean): Promise<void> {
  await prisma.discoveredJob.update({ where: { canonicalUrl }, data: { dismissed } });
}
