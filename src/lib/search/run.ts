import { getProfile } from "@/lib/data/profile";
import { getSettings } from "@/lib/data/settings";
import { extractJobPostingFromText } from "@/lib/job-extraction";
import { computeEligibility, computeJobMatch } from "@/lib/job-matching";
import { DEFAULT_MATCH_WEIGHTS, matchLabel } from "@/lib/constants";
import { getEnabledProviders } from "@/lib/search/registry";
import { looksLikeInternship } from "@/lib/search/classify";
import { buildSearchQueries, roleFromProfile } from "@/lib/search/queries";
import type { NormalizedSearchJob, SearchQuery } from "@/lib/search/types";

export type SearchResultDto = {
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

function canonicalUrl(raw: string): string {
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
  const match = computeJobMatch(profile, jobForMatching, DEFAULT_MATCH_WEIGHTS, {
    preferredCountries: settings.preferredCountries,
    preferredSectors: settings.preferredSectors,
  });
  const eligibility = computeEligibility(profile, jobForMatching);
  return { match, eligibility };
}

export type RunSearchInput = {
  keywords?: string;
  countryName?: string | null;
  countryCode?: string | null;
  remote?: boolean;
};

export type RunSearchOutput = {
  results: SearchResultDto[];
  providerCounts: Record<string, number>;
  errors: string[];
};

export async function runSearch(input: RunSearchInput): Promise<RunSearchOutput> {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const providers = getEnabledProviders();

  const baseKeywords = (input.keywords?.trim() || `${roleFromProfile(profile)} internship`).trim();
  const configuredQueries = input.countryName !== undefined
    ? [{
        keywords: baseKeywords,
        countryName: input.countryName ?? null,
        countryCode: input.countryCode ?? null,
        remote: Boolean(input.remote),
      }]
    : buildSearchQueries(profile, settings, baseKeywords).slice(0, 1);

  const query: SearchQuery = configuredQueries[0];
  const errors: string[] = [];
  const collected: NormalizedSearchJob[] = [];
  const providerCounts: Record<string, number> = {};

  await Promise.all(
    providers.map(async (provider) => {
      try {
        if (provider.mode === "catalog") {
          const catalog = await provider.search({ ...query, keywords: baseKeywords, countryName: null, countryCode: null }, 300);
          const filtered = query.remote ? catalog.filter((job) => job.remoteType === "REMOTE") : catalog;
          collected.push(...filtered);
          providerCounts[provider.id] = filtered.length;
        } else {
          const jobs = await provider.search(query, 25);
          collected.push(...jobs);
          providerCounts[provider.id] = jobs.length;
        }
      } catch (error) {
        errors.push(`${provider.label} : ${error instanceof Error ? error.message : "erreur"}`);
        providerCounts[provider.id] = 0;
      }
    }),
  );

  // Deduplicate by canonical URL, keeping the richest description.
  const byUrl = new Map<string, NormalizedSearchJob>();
  for (const job of collected) {
    const key = canonicalUrl(job.url);
    const existing = byUrl.get(key);
    if (!existing || (!existing.description && job.description)) byUrl.set(key, job);
  }

  const results = [...byUrl.values()]
    .filter((job) => (job.providerId === "serper" ? true : looksLikeInternship(`${job.title} ${job.description ?? ""}`)))
    .map((job) => {
      // Web results (Serper) are links, not postings with requirements — the
      // match engine would over-score them, so they stay unscored.
      const isWeb = job.providerId === "serper";
      const { match, eligibility } = isWeb ? { match: null, eligibility: null } : score(job, profile, settings);
      return {
        id: job.id,
        source: job.source,
        title: job.title,
        company: job.company,
        city: job.city,
        country: countryNameFor(job),
        remoteType: job.remoteType,
        url: job.url,
        postedAt: job.postedAt,
        salaryAmount: job.salaryAmount,
        salaryCurrency: job.salaryCurrency,
        description: job.description,
        matchScore: match?.total ?? null,
        matchLabel: match ? matchLabel(match.total) : "",
        eligibilityStatus: eligibility?.status ?? null,
      } satisfies SearchResultDto;
    })
    .sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1))
    .slice(0, 80);

  return { results, providerCounts, errors };
}
