// JSearch (via RapidAPI) — a licensed data reseller that aggregates Google
// for Jobs (itself pulling from LinkedIn, Indeed, Glassdoor and others).
// This is the legal way to reach that data: JSearch has a commercial
// agreement to redistribute it, unlike scraping those sites directly.
// Requires a RapidAPI account and a subscription to JSearch's free tier
// (see README > Sources de données > JSearch for signup steps).

import type { JobSourceProvider, RawSourceJob, SourceHealthCheck } from "@/lib/discover/types";

const FETCH_TIMEOUT_MS = 15_000;

type JSearchJob = {
  job_id: string;
  job_title: string;
  employer_name?: string;
  job_description?: string;
  job_city?: string;
  job_country?: string;
  job_apply_link: string;
  job_posted_at_datetime_utc?: string;
  job_employment_type?: string;
  job_is_remote?: boolean;
};

type JSearchConfig = { apiKey: string; query: string };

function readConfig(config: Record<string, unknown>): JSearchConfig {
  const apiKey = typeof config.apiKey === "string" ? config.apiKey.trim() : "";
  const query = typeof config.query === "string" && config.query.trim() ? config.query.trim() : "internship";
  if (!apiKey) throw new Error("Clé API RapidAPI manquante dans la configuration de cette source JSearch.");
  return { apiKey, query };
}

async function search(config: JSearchConfig, page: number): Promise<JSearchJob[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = new URL("https://jsearch.p.rapidapi.com/search");
    url.searchParams.set("query", config.query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("num_pages", "1");

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { "X-RapidAPI-Key": config.apiKey, "X-RapidAPI-Host": "jsearch.p.rapidapi.com", Accept: "application/json" },
    });
    if (!res.ok) {
      const hint = res.status === 401 || res.status === 403 ? " (clé RapidAPI invalide ou abonnement JSearch manquant)" : res.status === 429 ? " (quota RapidAPI dépassé)" : "";
      throw new Error(`JSearch a répondu ${res.status}${hint}`);
    }
    const data = (await res.json()) as { data?: JSearchJob[] };
    return data.data ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

export const jsearchProvider: JobSourceProvider = {
  type: "JSEARCH",

  async searchJobs(rawConfig) {
    const config = readConfig(rawConfig);
    const results = await search(config, 1);
    return results.map(
      (j): RawSourceJob => ({
        sourceJobId: j.job_id,
        sourceUrl: j.job_apply_link,
        title: j.job_title,
        companyName: j.employer_name ?? "Entreprise non renseignée",
        description: j.job_description ?? null,
        departmentOrTeam: null,
        locationText: [j.job_city, j.job_country].filter(Boolean).join(", ") || null,
        remoteType: j.job_is_remote ? "REMOTE" : null,
        postedAt: j.job_posted_at_datetime_utc ? new Date(j.job_posted_at_datetime_utc) : null,
        contractType: j.job_employment_type ?? null,
      }),
    );
  },

  async healthCheck(rawConfig): Promise<SourceHealthCheck> {
    try {
      const config = readConfig(rawConfig);
      const results = await search(config, 1);
      return { ok: true, message: `Connecté à JSearch — ${results.length} résultat(s) pour "${config.query}".`, jobCount: results.length };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Impossible de joindre JSearch." };
    }
  },
};
