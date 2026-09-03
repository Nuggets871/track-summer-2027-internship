// Greenhouse's public Job Board API — no API key required, genuinely public:
// https://developers.greenhouse.io/job-board.html
//
// It's scoped to one company's board at a time (config: { boardToken }), not
// a global search across every company on Greenhouse — that endpoint simply
// doesn't exist publicly. "Adding this source" means tracking one company.

import type { JobSourceProvider, RawSourceJob, SourceHealthCheck } from "@/lib/discover/types";
import { parseDateSafe } from "@/lib/discover/dates";

const FETCH_TIMEOUT_MS = 15_000;

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location?: { name?: string };
  departments?: { name?: string }[];
  content?: string; // HTML, only present when ?content=true
};

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Greenhouse a répondu ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function getBoardToken(config: Record<string, unknown>): string {
  const token = typeof config.boardToken === "string" ? config.boardToken.trim() : "";
  if (!token) throw new Error("boardToken manquant dans la configuration de cette source Greenhouse.");
  return token;
}

export const greenhouseProvider: JobSourceProvider = {
  type: "GREENHOUSE",

  async searchJobs(config) {
    const boardToken = getBoardToken(config);
    const data = await fetchJson<{ jobs: GreenhouseJob[] }>(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`,
    );

    const companyName = typeof config.companyLabel === "string" && config.companyLabel ? config.companyLabel : boardToken;

    const jobs: RawSourceJob[] = data.jobs.map((j) => ({
      sourceJobId: String(j.id),
      sourceUrl: j.absolute_url,
      title: j.title,
      companyName,
      description: j.content ?? null,
      departmentOrTeam: j.departments?.[0]?.name ?? null,
      locationText: j.location?.name ?? null,
      remoteType: /remote/i.test(j.location?.name ?? "") ? "REMOTE" : null,
      postedAt: parseDateSafe(j.updated_at),
      contractType: null,
    }));

    return jobs;
  },

  async healthCheck(config): Promise<SourceHealthCheck> {
    try {
      const boardToken = getBoardToken(config);
      const data = await fetchJson<{ jobs: GreenhouseJob[] }>(
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=false`,
      );
      return { ok: true, message: `Connecté — ${data.jobs.length} offre(s) sur ce board.`, jobCount: data.jobs.length };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Impossible de joindre Greenhouse." };
    }
  },
};
