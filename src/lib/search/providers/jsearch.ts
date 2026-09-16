import { htmlToText } from "@/lib/job-extraction";
import type { JobSearchProvider, NormalizedSearchJob, SearchQuery } from "@/lib/search/types";

const HOST = "jsearch.p.rapidapi.com";
const BASE = `https://${HOST}/search-v2`;
const TIMEOUT_MS = 15_000;

// JSearch's `country` param returns 0 results for common queries; putting the
// country in the query text works far better.
const ENGLISH_COUNTRY_BY_CODE: Record<string, string> = {
  gb: "United Kingdom", fr: "France", de: "Germany", ch: "Switzerland", nl: "Netherlands",
  sg: "Singapore", us: "United States", ca: "Canada", ie: "Ireland", es: "Spain", it: "Italy",
  se: "Sweden", be: "Belgium", at: "Austria", dk: "Denmark", no: "Norway", au: "Australia",
  nz: "New Zealand", in: "India", pl: "Poland", pt: "Portugal",
};

type JSearchJob = {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string | null;
  job_country?: string | null;
  job_is_remote?: boolean;
  job_apply_link?: string;
  job_google_link?: string;
  job_description?: string;
  job_posted_at_datetime_utc?: string;
  job_employment_type?: string;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary?: number | null;
  job_salary_currency?: string | null;
};

async function requestOnce(url: string, apiKey: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": HOST },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`JSearch ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// The JSearch backend is intermittently slow (observed 6s…timeout on the same
// query), so one retry makes the source reliable enough to keep enabled.
async function fetchJson(url: string, apiKey: string): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestOnce(url, apiKey);
    } catch (error) {
      if (attempt === 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }
  throw new Error("JSearch unreachable");
}

export const jsearchProvider: JobSearchProvider = {
  id: "jsearch",
  label: "JSearch (LinkedIn, Indeed, Glassdoor…)",
  envVars: ["JSEARCH_API_KEY"],
  requiresKey: true,
  mode: "query",
  quota: { limit: 190, period: "month" },
  cacheTtlSeconds: 60 * 30,
  isConfigured: () => Boolean(process.env.JSEARCH_API_KEY),

  async search(query: SearchQuery, limit: number): Promise<NormalizedSearchJob[]> {
    const apiKey = process.env.JSEARCH_API_KEY;
    if (!apiKey) return [];

    const countryName = query.countryCode ? ENGLISH_COUNTRY_BY_CODE[query.countryCode.toLowerCase()] : null;
    const params = new URLSearchParams({
      query: countryName ? `${query.keywords} ${countryName}` : query.keywords,
      num_pages: "1",
      page: "1",
      date_posted: "month",
    });
    if (query.remote) params.set("remote_jobs_only", "true");

    const payload = (await fetchJson(`${BASE}?${params.toString()}`, apiKey)) as { data?: { jobs?: JSearchJob[] } };
    const jobs = payload.data?.jobs ?? [];

    return jobs
      .map((job): NormalizedSearchJob | null => {
        const url = job.job_apply_link || job.job_google_link;
        if (!job.job_title || !job.employer_name || !url) return null;
        return {
          id: `jsearch:${job.job_id ?? url}`,
          providerId: "jsearch",
          source: "JSearch",
          title: job.job_title,
          company: job.employer_name,
          city: job.job_city ?? null,
          country: null,
          countryCode: job.job_country ?? query.countryCode,
          remoteType: job.job_is_remote ? "REMOTE" : null,
          url,
          description: job.job_description ? htmlToText(job.job_description).slice(0, 8_000) : null,
          postedAt: job.job_posted_at_datetime_utc ?? null,
          salaryAmount: job.job_min_salary ?? job.job_salary ?? null,
          salaryCurrency: job.job_salary_currency ?? null,
          employmentType: job.job_employment_type ?? null,
        };
      })
      .filter((job): job is NormalizedSearchJob => job !== null)
      .slice(0, limit);
  },
};
