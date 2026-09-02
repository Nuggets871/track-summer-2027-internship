// Jooble's job search API — a free API key requested via a short form
// (see README > Sources de données > Jooble for the exact steps). The
// response doesn't include a stable job id, so the listing URL itself is
// used as sourceJobId — consistent with how the RSS provider handles the
// same gap.

import type { JobSourceProvider, RawSourceJob, SourceHealthCheck } from "@/lib/discover/types";

const FETCH_TIMEOUT_MS = 15_000;

type JoobleJob = {
  title: string;
  location?: string;
  snippet?: string;
  link: string;
  company?: string;
  updated?: string;
  type?: string;
};

type JoobleConfig = { apiKey: string; keywords: string; location: string | null };

function readConfig(config: Record<string, unknown>): JoobleConfig {
  const apiKey = typeof config.apiKey === "string" ? config.apiKey.trim() : "";
  const keywords = typeof config.keywords === "string" && config.keywords.trim() ? config.keywords.trim() : "internship";
  const location = typeof config.location === "string" && config.location.trim() ? config.location.trim() : null;
  if (!apiKey) throw new Error("Clé API Jooble manquante dans la configuration de cette source.");
  return { apiKey, keywords, location };
}

async function search(config: JoobleConfig): Promise<{ jobs: JoobleJob[]; totalCount: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`https://jooble.org/api/${encodeURIComponent(config.apiKey)}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ keywords: config.keywords, location: config.location ?? undefined }),
    });
    if (!res.ok) {
      const hint = res.status === 401 || res.status === 403 ? " (clé API invalide)" : "";
      throw new Error(`Jooble a répondu ${res.status}${hint}`);
    }
    return (await res.json()) as { jobs: JoobleJob[]; totalCount: number };
  } finally {
    clearTimeout(timeout);
  }
}

export const joobleProvider: JobSourceProvider = {
  type: "JOOBLE",

  async searchJobs(rawConfig) {
    const config = readConfig(rawConfig);
    const { jobs } = await search(config);
    return jobs
      .filter((j) => j.link)
      .map(
        (j): RawSourceJob => ({
          sourceJobId: j.link,
          sourceUrl: j.link,
          title: j.title,
          companyName: j.company ?? "Entreprise non renseignée",
          description: j.snippet ?? null,
          departmentOrTeam: null,
          locationText: j.location ?? null,
          remoteType: null,
          postedAt: j.updated ? new Date(j.updated) : null,
          contractType: j.type ?? null,
        }),
      );
  },

  async healthCheck(rawConfig): Promise<SourceHealthCheck> {
    try {
      const config = readConfig(rawConfig);
      const { totalCount } = await search(config);
      return { ok: true, message: `Connecté à Jooble — ${totalCount} résultat(s) pour "${config.keywords}".`, jobCount: totalCount };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Impossible de joindre Jooble." };
    }
  },
};
