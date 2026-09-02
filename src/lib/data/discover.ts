import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { searchListingIds } from "@/lib/discover/search-index";
import { safeJsonParse } from "@/lib/utils";

export type DiscoverSort = "match" | "newest" | "deadline" | "salary" | "company";

export type DiscoverFilters = {
  query?: string;
  countries?: string[];
  cities?: string[];
  sectors?: string[];
  remoteTypes?: ("REMOTE" | "HYBRID" | "ONSITE")[];
  minMatch?: number;
  postedWithinDays?: number;
  visaSponsorshipOnly?: boolean;
  sourceIds?: string[];
  includeAllRoles?: boolean; // when false (default), only isInternship rows
  savedOnly?: boolean; // already linked to an Opportunity
};

const PAGE_SIZE = 30;

export const discoverListingInclude = {
  source: { select: { id: true, name: true, type: true } },
} satisfies Prisma.JobListingInclude;

export type DiscoverListingRow = Prisma.JobListingGetPayload<{ include: typeof discoverListingInclude }>;

async function buildWhere(filters: DiscoverFilters): Promise<Prisma.JobListingWhereInput> {
  const where: Prisma.JobListingWhereInput = {
    status: "ACTIVE",
    duplicateOfId: null,
  };

  if (!filters.includeAllRoles) where.isInternship = true;
  if (filters.countries?.length) where.countryName = { in: filters.countries };
  if (filters.cities?.length) where.cityName = { in: filters.cities };
  if (filters.sectors?.length) where.sector = { in: filters.sectors };
  if (filters.remoteTypes?.length) where.remoteType = { in: filters.remoteTypes };
  if (filters.minMatch !== undefined) where.matchScore = { gte: filters.minMatch };
  if (filters.visaSponsorshipOnly) where.visaSponsorship = true;
  if (filters.sourceIds?.length) where.sourceId = { in: filters.sourceIds };
  if (filters.savedOnly) where.linkedApplicationId = { not: null };
  if (filters.postedWithinDays !== undefined) {
    where.postedAt = { gte: new Date(Date.now() - filters.postedWithinDays * 24 * 60 * 60 * 1000) };
  }

  if (filters.query?.trim()) {
    const ids = await searchListingIds(filters.query.trim());
    where.id = { in: ids ?? [] };
  }

  return where;
}

function orderByFor(sort: DiscoverSort): Prisma.JobListingOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ postedAt: "desc" }, { discoveredAt: "desc" }];
    case "deadline":
      return [{ expiresAt: "asc" }];
    case "salary":
      return [{ salaryAmount: "desc" }];
    case "company":
      return [{ companyName: "asc" }];
    case "match":
    default:
      return [{ matchScore: "desc" }, { postedAt: "desc" }];
  }
}

export async function searchDiscoverListings(
  filters: DiscoverFilters,
  sort: DiscoverSort,
  page: number,
): Promise<{ items: DiscoverListingRow[]; total: number; hasMore: boolean }> {
  const where = await buildWhere(filters);
  const [items, total] = await Promise.all([
    prisma.jobListing.findMany({
      where,
      include: discoverListingInclude,
      orderBy: orderByFor(sort),
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.jobListing.count({ where }),
  ]);
  return { items, total, hasMore: (page + 1) * PAGE_SIZE < total };
}

export async function getListingDetail(id: string) {
  return prisma.jobListing.findUnique({
    where: { id },
    include: {
      source: true,
      duplicates: { select: { id: true, source: { select: { name: true } }, sourceUrl: true } },
    },
  });
}

export function parseListingArrays(listing: {
  requiredSkills: string | null;
  requiredLanguages: string | null;
  tags: string | null;
  matchBreakdown: string | null;
  strengths: string | null;
  watchouts: string | null;
  missingSkills: string | null;
  eligibilityNotes: string | null;
}) {
  return {
    requiredSkillsList: safeJsonParse<string[]>(listing.requiredSkills, []),
    requiredLanguagesList: safeJsonParse<string[]>(listing.requiredLanguages, []),
    tagsList: safeJsonParse<string[]>(listing.tags, []),
    matchBreakdownList: safeJsonParse<{ key: string; label: string; value: number; weight: number; contribution: number }[]>(
      listing.matchBreakdown,
      [],
    ),
    strengthsList: safeJsonParse<string[]>(listing.strengths, []),
    watchoutsList: safeJsonParse<string[]>(listing.watchouts, []),
    missingSkillsList: safeJsonParse<string[]>(listing.missingSkills, []),
    eligibilityNotesList: safeJsonParse<string[]>(listing.eligibilityNotes, []),
  };
}

/** Distinct filter option lists (countries/cities/sectors/sources currently
 * represented among active internship listings) — built from real data, so
 * the filter panel never offers an option with zero results. */
export async function getDiscoverFilterOptions() {
  const [countries, cities, sectors, sources] = await Promise.all([
    prisma.jobListing.findMany({
      where: { status: "ACTIVE", duplicateOfId: null, isInternship: true, countryName: { not: null } },
      distinct: ["countryName"],
      select: { countryName: true },
      orderBy: { countryName: "asc" },
    }),
    prisma.jobListing.findMany({
      where: { status: "ACTIVE", duplicateOfId: null, isInternship: true, cityName: { not: null } },
      distinct: ["cityName"],
      select: { cityName: true },
      orderBy: { cityName: "asc" },
    }),
    prisma.jobListing.findMany({
      where: { status: "ACTIVE", duplicateOfId: null, isInternship: true, sector: { not: null } },
      distinct: ["sector"],
      select: { sector: true },
      orderBy: { sector: "asc" },
    }),
    prisma.jobSource.findMany({ where: { enabled: true }, select: { id: true, name: true } }),
  ]);

  return {
    countries: countries.map((c) => c.countryName!),
    cities: cities.map((c) => c.cityName!),
    sectors: sectors.map((c) => c.sector!),
    sources,
  };
}

export async function getDiscoverSections() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const baseWhere = { status: "ACTIVE" as const, duplicateOfId: null, isInternship: true };

  const [recommended, newThisWeek, closingSoon, visaFriendly] = await Promise.all([
    prisma.jobListing.findMany({
      where: { ...baseWhere, matchScore: { gte: 70 } },
      include: discoverListingInclude,
      orderBy: [{ matchScore: "desc" }],
      take: 6,
    }),
    prisma.jobListing.findMany({
      where: { ...baseWhere, postedAt: { gte: weekAgo } },
      include: discoverListingInclude,
      orderBy: [{ postedAt: "desc" }],
      take: 6,
    }),
    prisma.jobListing.findMany({
      where: { ...baseWhere, expiresAt: { gte: now, lte: twoWeeksAhead } },
      include: discoverListingInclude,
      orderBy: [{ expiresAt: "asc" }],
      take: 6,
    }),
    prisma.jobListing.findMany({
      where: { ...baseWhere, visaSponsorship: true },
      include: discoverListingInclude,
      orderBy: [{ matchScore: "desc" }],
      take: 6,
    }),
  ]);

  return { recommended, newThisWeek, closingSoon, visaFriendly };
}

// `config` holds API keys/tokens for some source types — never select it
// here. This is the only read path the Settings > Sources UI (a client
// component) uses, so excluding it here is what keeps a saved key from ever
// reaching the browser.
const jobSourceSafeSelect = {
  id: true,
  type: true,
  name: true,
  enabled: true,
  status: true,
  lastSyncedAt: true,
  lastSyncError: true,
  jobCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.JobSourceSelect;

export type JobSourceSafe = Prisma.JobSourceGetPayload<{ select: typeof jobSourceSafeSelect }>;

export async function getJobSources(): Promise<JobSourceSafe[]> {
  return prisma.jobSource.findMany({ select: jobSourceSafeSelect, orderBy: { createdAt: "asc" } });
}

/**
 * Config for the Edit dialog — non-secret fields (country, query, feed
 * URL...) come through as-is so they can be prefilled; any key listed in
 * SECRET_CONFIG_KEYS for this source's type is stripped entirely. The
 * dialog shows those fields blank with a "leave empty to keep" hint, and
 * updateJobSource() only overwrites what's actually resubmitted.
 */
export async function getJobSourceEditableConfig(id: string) {
  const { SECRET_CONFIG_KEYS } = await import("@/lib/discover/providers/registry");
  const source = await prisma.jobSource.findUniqueOrThrow({
    where: { id },
    select: { id: true, type: true, name: true, config: true },
  });
  const config = safeJsonParse<Record<string, unknown>>(source.config, {});
  const secretKeys = SECRET_CONFIG_KEYS[source.type as keyof typeof SECRET_CONFIG_KEYS] ?? [];
  for (const key of secretKeys) delete config[key];
  return { id: source.id, type: source.type, name: source.name, config };
}

export async function getSavedSearches() {
  return prisma.savedSearch.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getJobWatches() {
  return prisma.jobWatch.findMany({ orderBy: { createdAt: "desc" } });
}

/** Listings created since a watch's last notification that match its
 * criteria — used to flag "New match" without storing a denormalized copy
 * of every watch's results. */
export async function getNewMatchesForWatch(watch: {
  id: string;
  keyword: string | null;
  countryName: string | null;
  cityName: string | null;
  sector: string | null;
  lastNotifiedAt: Date | null;
  createdAt: Date;
}) {
  const since = watch.lastNotifiedAt ?? watch.createdAt;
  const where: Prisma.JobListingWhereInput = {
    status: "ACTIVE",
    duplicateOfId: null,
    isInternship: true,
    discoveredAt: { gt: since },
  };
  if (watch.countryName) where.countryName = watch.countryName;
  if (watch.cityName) where.cityName = watch.cityName;
  if (watch.sector) where.sector = watch.sector;
  if (watch.keyword) {
    where.OR = [
      { title: { contains: watch.keyword } },
      { companyName: { contains: watch.keyword } },
      { description: { contains: watch.keyword } },
    ];
  }
  return prisma.jobListing.findMany({ where, include: discoverListingInclude, orderBy: { discoveredAt: "desc" }, take: 20 });
}
