import { getProfile } from "@/lib/data/profile";
import { getSettings } from "@/lib/data/settings";
import { extractJobPostingFromText } from "@/lib/job-extraction";
import { computeEligibility, computeJobMatch } from "@/lib/job-matching";
import { DEFAULT_MATCH_WEIGHTS, matchLabel } from "@/lib/constants";
import { getEnabledProviders } from "@/lib/search/registry";
import { looksLikeInternship } from "@/lib/search/classify";
import { buildSearchQueries, roleFromProfile } from "@/lib/search/queries";
import {
  getCachedJobs,
  getDismissedUrls,
  getUsage,
  incrementUsage,
  periodKeyFor,
  persistDiscovered,
  saveCachedJobs,
} from "@/lib/search/store";
import type { JobSearchProvider, NormalizedSearchJob, SearchQuery } from "@/lib/search/types";

export type SearchResultDto = {
  canonicalUrl: string;
  id: string;
  source: string;
  title: string;
  company: string;
  city: string | null;
  country: string | null;
  remoteType: string | null;
  url: string;
  postedAt: string | null;
  salaryAmount: number | null;
  salaryCurrency: string | null;
  description: string | null;
  matchScore: number | null;
  matchLabel: string;
  eligibilityStatus: string | null;
  isNew: boolean;
  dismissed: boolean;
};

export type ProviderRunStatus = {
  id: string;
  label: string;
  status: "ok" | "cache" | "quota" | "error" | "skipped";
  count: number;
  remaining: number | null;
  message?: string;
};

export type RunSearchInput = {
  keywords?: string;
  countryName?: string | null;
  countryCode?: string | null;
  remote?: boolean;
  providerIds?: string[];
  force?: boolean;
};

export type RunSearchOutput = {
  results: SearchResultDto[];
  providerStatus: ProviderRunStatus[];
  errors: string[];
};

const COUNTRY_NAME_BY_CODE: Record<string, string> = {
  gb: "Royaume-Uni", uk: "Royaume-Uni", fr: "France", de: "Allemagne", ch: "Suisse", nl: "Pays-Bas", sg: "Singapour",
  us: "États-Unis", ca: "Canada", ie: "Irlande", es: "Espagne", it: "Italie", se: "Suède",
  be: "Belgique", at: "Autriche", lu: "Luxembourg", dk: "Danemark", no: "Norvège", au: "Australie",
  nz: "Nouvelle-Zélande", in: "Inde", pl: "Pologne", pt: "Portugal",
};

function countryNameFor(job: NormalizedSearchJob): string | null {
  const raw = job.country ?? job.countryCode;
  if (!raw) return null;
  return raw.length <= 3 ? COUNTRY_NAME_BY_CODE[raw.toLowerCase()] ?? raw : raw;
}

export function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    url.search = "";
    return `${url.hostname.replace(/^www\./, "").toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return raw.toLowerCase();
  }
}

function score(job: NormalizedSearchJob, profile: Awaited<ReturnType<typeof getProfile>>, settings: Awaited<ReturnType<typeof getSettings>>) {
  const source = job.description ?? job.title;
  const extracted = extractJobPostingFromText(source);
  const jobForMatching = {
    requiredSkills: extracted.requiredSkills,
    requiredLanguages: extracted.requiredLanguages,
    requiredEducationLevel: extracted.requiredEducationLevel,
    requiredExperienceYears: extracted.requiredExperienceYears,
    countryName: countryNameFor(job),
    remoteType: job.remoteType,
    sector: null,
    rawText: extracted.rawText || source,
    requiredStartDate: null,
    requiredEndDate: null,
    durationWeeks: null,
  };
  return {
    match: computeJobMatch(profile, jobForMatching, DEFAULT_MATCH_WEIGHTS, {
      preferredCountries: settings.preferredCountries,
      preferredSectors: settings.preferredSectors,
    }),
    eligibility: computeEligibility(profile, jobForMatching),
  };
}

async function fetchProvider(
  provider: JobSearchProvider,
  query: SearchQuery,
  baseKeywords: string,
  force: boolean,
): Promise<{ jobs: NormalizedSearchJob[]; status: ProviderRunStatus }> {
  const status: ProviderRunStatus = { id: provider.id, label: provider.label, status: "skipped", count: 0, remaining: null };

  let periodKey: string | null = null;
  if (provider.quota) {
    periodKey = periodKeyFor(provider.quota.period);
    const used = await getUsage(provider.id, periodKey);
    status.remaining = Math.max(0, provider.quota.limit - used);
    if (used >= provider.quota.limit) {
      status.status = "quota";
      status.message = `quota ${provider.quota.period === "day" ? "journalier" : "mensuel"} atteint`;
      return { jobs: [], status };
    }
  }

  const cacheKey = `${provider.id}|${baseKeywords.toLowerCase()}|${query.countryCode ?? ""}|${query.remote ? "1" : "0"}`;
  if (!force && provider.cacheTtlSeconds) {
    const cached = await getCachedJobs(cacheKey, provider.cacheTtlSeconds);
    if (cached) {
      status.status = "cache";
      status.count = cached.length;
      return { jobs: cached, status };
    }
  }

  const searchQuery: SearchQuery = provider.mode === "catalog"
    ? { ...query, keywords: baseKeywords, countryName: null, countryCode: null }
    : query;
  const raw = await provider.search(searchQuery, provider.mode === "catalog" ? 300 : 25);

  if (provider.cacheTtlSeconds) await saveCachedJobs(cacheKey, provider.id, raw);
  if (provider.quota && periodKey) {
    await incrementUsage(provider.id, periodKey);
    status.remaining = Math.max(0, status.remaining! - 1);
  }
  status.status = "ok";
  status.count = raw.length;
  return { jobs: raw, status };
}

export async function runSearch(input: RunSearchInput): Promise<RunSearchOutput> {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const enabled = getEnabledProviders();
  const providers = input.providerIds?.length ? enabled.filter((p) => input.providerIds!.includes(p.id)) : enabled;

  const baseKeywords = (input.keywords?.trim() || `${roleFromProfile(profile)} internship`).trim();
  const query: SearchQuery = input.countryName !== undefined
    ? { keywords: baseKeywords, countryName: input.countryName ?? null, countryCode: input.countryCode ?? null, remote: Boolean(input.remote) }
    : buildSearchQueries(profile, settings, baseKeywords)[0];

  const errors: string[] = [];
  const collected: NormalizedSearchJob[] = [];

  const providerResults = await Promise.all(
    providers.map(async (provider) => {
      try {
        const { jobs, status } = await fetchProvider(provider, query, baseKeywords, Boolean(input.force));
        if (provider.mode === "catalog" && query.remote) {
          return { jobs: jobs.filter((job) => job.remoteType === "REMOTE"), status };
        }
        return { jobs, status };
      } catch (error) {
        errors.push(`${provider.label} : ${error instanceof Error ? error.message : "erreur"}`);
        return { jobs: [] as NormalizedSearchJob[], status: { id: provider.id, label: provider.label, status: "error" as const, count: 0, remaining: null } };
      }
    }),
  );

  const providerStatus = providerResults.map((result) => result.status);
  for (const result of providerResults) collected.push(...result.jobs);

  // Deduplicate by canonical URL, keeping the richest description.
  const byUrl = new Map<string, NormalizedSearchJob>();
  for (const job of collected) {
    const key = canonicalUrl(job.url);
    const existing = byUrl.get(key);
    if (!existing || (!existing.description && job.description)) byUrl.set(key, job);
  }

  const candidates = [...byUrl.values()].filter((job) =>
    job.providerId === "serper" ? true : looksLikeInternship(`${job.title} ${job.description ?? ""}`),
  );

  const items = candidates.map((job) => {
    const isWeb = job.providerId === "serper";
    const { match, eligibility } = isWeb ? { match: null, eligibility: null } : score(job, profile, settings);
    return {
      canonicalUrl: canonicalUrl(job.url),
      job,
      matchScore: match?.total ?? null,
      matchLabel: match ? matchLabel(match.total) : "",
      eligibilityStatus: eligibility?.status ?? null,
    };
  });

  const newUrls = await persistDiscovered(items);
  const dismissedUrls = await getDismissedUrls(items.map((item) => item.canonicalUrl));

  const results = items
    .map((item) => ({
      canonicalUrl: item.canonicalUrl,
      id: item.job.id,
      source: item.job.source,
      title: item.job.title,
      company: item.job.company,
      city: item.job.city,
      country: countryNameFor(item.job),
      remoteType: item.job.remoteType,
      url: item.job.url,
      postedAt: item.job.postedAt,
      salaryAmount: item.job.salaryAmount,
      salaryCurrency: item.job.salaryCurrency,
      description: item.job.description,
      matchScore: item.matchScore,
      matchLabel: item.matchLabel,
      eligibilityStatus: item.eligibilityStatus,
      isNew: newUrls.has(item.canonicalUrl),
      dismissed: dismissedUrls.has(item.canonicalUrl),
    }))
    .sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1))
    .slice(0, 120);

  return { results, providerStatus, errors };
}
