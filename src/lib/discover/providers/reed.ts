// Reed.co.uk's job search API — free, real, UK-only (no other country
// coverage exists on this API). Authenticates with HTTP Basic auth using
// the API key as the username and an empty password, per Reed's own docs.

import type { JobSourceProvider, RawSourceJob, SourceHealthCheck } from "@/lib/discover/types";
import { parseDateSafe } from "@/lib/discover/dates";

const FETCH_TIMEOUT_MS = 15_000;

type ReedJob = {
  jobId: number;
  jobTitle: string;
  employerName?: string;
  jobDescription?: string;
  locationName?: string;
  date?: string;
  jobUrl: string;
  contractType?: string;
};

type ReedConfig = { apiKey: string; keywords: string };

function readConfig(config: Record<string, unknown>): ReedConfig {
  const apiKey = typeof config.apiKey === "string" ? config.apiKey.trim() : "";
  const keywords = typeof config.keywords === "string" && config.keywords.trim() ? config.keywords.trim() : "internship";
  if (!apiKey) throw new Error("Clé API Reed manquante dans la configuration de cette source.");
  return { apiKey, keywords };
}

async function search(config: ReedConfig): Promise<{ results: ReedJob[]; totalResults: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = new URL("https://www.reed.co.uk/api/1.0/search");
    url.searchParams.set("keywords", config.keywords);
    url.searchParams.set("resultsToTake", "100");

    const basicAuth = Buffer.from(`${config.apiKey}:`).toString("base64");
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Authorization: `Basic ${basicAuth}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const hint = res.status === 401 ? " (clé API invalide)" : "";
      throw new Error(`Reed a répondu ${res.status}${hint}`);
    }
    return (await res.json()) as { results: ReedJob[]; totalResults: number };
  } finally {
    clearTimeout(timeout);
  }
}

export const reedProvider: JobSourceProvider = {
  type: "REED",

  async searchJobs(rawConfig) {
    const config = readConfig(rawConfig);
    const { results } = await search(config);
    return results.map(
      (j): RawSourceJob => ({
        sourceJobId: String(j.jobId),
        sourceUrl: j.jobUrl,
        title: j.jobTitle,
        companyName: j.employerName ?? "Entreprise non renseignée",
        description: j.jobDescription ?? null,
        departmentOrTeam: null,
        locationText: j.locationName ?? null,
        remoteType: null,
        postedAt: parseDateSafe(j.date),
        contractType: j.contractType ?? null,
      }),
    );
  },

  async healthCheck(rawConfig): Promise<SourceHealthCheck> {
    try {
      const config = readConfig(rawConfig);
      const { totalResults } = await search(config);
      return { ok: true, message: `Connecté à Reed — ${totalResults} résultat(s) pour "${config.keywords}".`, jobCount: totalResults };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Impossible de joindre Reed." };
    }
  },
};
