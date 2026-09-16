import { htmlToText } from "@/lib/job-extraction";
import type { JobSearchProvider, NormalizedSearchJob, SearchQuery } from "@/lib/search/types";

const BASE = "https://api.adzuna.com/v1/api/jobs";
const TIMEOUT_MS = 15_000;

// Adzuna doesn't return a currency field; salaries are in local currency.
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  gb: "GBP", fr: "EUR", de: "EUR", nl: "EUR", at: "EUR", be: "EUR", ie: "EUR",
  es: "EUR", it: "EUR", ch: "CHF", us: "USD", ca: "CAD", au: "AUD", nz: "NZD",
  sg: "SGD", in: "INR", br: "BRL", mx: "MXN", pl: "PLN", za: "ZAR",
};

type AdzunaJob = {
  id?: string;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  redirect_url?: string;
  description?: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
};

export const adzunaProvider: JobSearchProvider = {
  id: "adzuna",
  label: "Adzuna",
  envVars: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"],
  requiresKey: true,
  mode: "query",
  quota: { limit: 240, period: "day" },
  cacheTtlSeconds: 60 * 30,
  isConfigured: () => Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),

  async search(query: SearchQuery, limit: number): Promise<NormalizedSearchJob[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) return [];

    const country = (query.countryCode ?? "gb").toLowerCase();
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: query.remote ? `${query.keywords} remote` : query.keywords,
      results_per_page: String(Math.min(limit, 50)),
      "content-type": "application/json",
      sort_by: "date",
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let payload: { results?: AdzunaJob[] };
    try {
      const res = await fetch(`${BASE}/${country}/search/1?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Adzuna ${res.status}`);
      payload = (await res.json()) as { results?: AdzunaJob[] };
    } finally {
      clearTimeout(timeout);
    }

    return (payload.results ?? [])
      .map((job): NormalizedSearchJob | null => {
        if (!job.title || !job.redirect_url) return null;
        const location = job.location?.display_name ?? null;
        return {
          id: `adzuna:${job.id ?? job.redirect_url}`,
          providerId: "adzuna",
          source: "Adzuna",
          title: job.title,
          company: job.company?.display_name ?? "Entreprise inconnue",
          city: location,
          country: null,
          countryCode: country,
          remoteType: query.remote ? "REMOTE" : null,
          url: job.redirect_url,
          description: job.description ? htmlToText(job.description).slice(0, 8_000) : null,
          postedAt: job.created ?? null,
          salaryAmount: job.salary_min ?? job.salary_max ?? null,
          salaryCurrency: CURRENCY_BY_COUNTRY[country] ?? null,
          employmentType: job.contract_type ?? job.contract_time ?? null,
        };
      })
      .filter((job): job is NormalizedSearchJob => job !== null);
  },
};
