// Adzuna's public search API — requires a free app_id/app_key pair (see
// README > Sources de données > Adzuna for signup steps). Unlike Greenhouse/
// Lever, this is a real cross-company search — but scoped to one country
// and one keyword query per source, since that's how the API itself works
// (no single endpoint searches every country at once).

import type { JobSourceProvider, RawSourceJob, SourceHealthCheck } from "@/lib/discover/types";

const FETCH_TIMEOUT_MS = 15_000;

type AdzunaJob = {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  created: string;
  contract_type?: string;
  contract_time?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  category?: { label?: string };
};

type AdzunaConfig = { appId: string; appKey: string; country: string; what: string };

function readConfig(config: Record<string, unknown>): AdzunaConfig {
  const appId = typeof config.appId === "string" ? config.appId.trim() : "";
  const appKey = typeof config.appKey === "string" ? config.appKey.trim() : "";
  const country = typeof config.country === "string" ? config.country.trim().toLowerCase() : "";
  const what = typeof config.what === "string" && config.what.trim() ? config.what.trim() : "internship";
  if (!appId || !appKey) throw new Error("app_id / app_key Adzuna manquants dans la configuration de cette source.");
  if (!country) throw new Error("Pays Adzuna manquant (ex : gb, fr, us, sg...).");
  return { appId, appKey, country, what };
}

async function search(config: AdzunaConfig, page: number, resultsPerPage: number): Promise<{ results: AdzunaJob[]; count: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(config.country)}/search/${page}`);
    url.searchParams.set("app_id", config.appId);
    url.searchParams.set("app_key", config.appKey);
    url.searchParams.set("what", config.what);
    url.searchParams.set("results_per_page", String(resultsPerPage));
    url.searchParams.set("content-type", "application/json");

    const res = await fetch(url.toString(), { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) {
      const status = res.status;
      const hint = status === 401 ? " (app_id/app_key invalides)" : status === 400 ? " (pays ou paramètres invalides)" : "";
      throw new Error(`Adzuna a répondu ${status}${hint}`);
    }
    return (await res.json()) as { results: AdzunaJob[]; count: number };
  } finally {
    clearTimeout(timeout);
  }
}

export const adzunaProvider: JobSourceProvider = {
  type: "ADZUNA",

  async searchJobs(rawConfig) {
    const config = readConfig(rawConfig);
    // Adzuna caps results_per_page (50) — pull a few pages so a broad query
    // like "internship" doesn't silently stop at the first 50.
    const PAGES = 3;
    const jobs: RawSourceJob[] = [];
    for (let page = 1; page <= PAGES; page++) {
      const { results } = await search(config, page, 50);
      if (results.length === 0) break;
      for (const j of results) {
        jobs.push({
          sourceJobId: j.id,
          sourceUrl: j.redirect_url,
          title: j.title,
          companyName: j.company?.display_name ?? "Entreprise non renseignée",
          description: j.description,
          departmentOrTeam: j.category?.label ?? null,
          locationText: j.location?.display_name ?? null,
          remoteType: null,
          postedAt: j.created ? new Date(j.created) : null,
          contractType: j.contract_type ?? j.contract_time ?? null,
        });
      }
      if (results.length < 50) break;
    }
    return jobs;
  },

  async healthCheck(rawConfig): Promise<SourceHealthCheck> {
    try {
      const config = readConfig(rawConfig);
      const { count } = await search(config, 1, 1);
      return { ok: true, message: `Connecté à Adzuna (${config.country.toUpperCase()}) — ${count} résultat(s) pour "${config.what}".`, jobCount: count };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Impossible de joindre Adzuna." };
    }
  },
};
