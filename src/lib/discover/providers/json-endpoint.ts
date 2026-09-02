// A generic JSON endpoint the user points at their own list of jobs
// (config: { endpointUrl }). Expects a JSON array of objects with
// reasonably-named fields (see generic-mapping.ts) — no vendor-specific
// assumptions, so it works with anything from a personal Notion export API
// to a small internal tool, as long as it's real and reachable.

import type { JobSourceProvider, RawSourceJob, SourceHealthCheck } from "@/lib/discover/types";
import { mapGenericRecordToRawJob } from "@/lib/discover/providers/generic-mapping";

const FETCH_TIMEOUT_MS = 15_000;

function getEndpointUrl(config: Record<string, unknown>): string {
  const url = typeof config.endpointUrl === "string" ? config.endpointUrl.trim() : "";
  if (!url) throw new Error("endpointUrl manquant dans la configuration de cette source JSON.");
  return url;
}

async function fetchArray(url: string): Promise<Record<string, unknown>[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`L'endpoint a répondu ${res.status}`);
    const data = await res.json();
    const array = Array.isArray(data) ? data : Array.isArray(data?.jobs) ? data.jobs : Array.isArray(data?.items) ? data.items : null;
    if (!array) throw new Error("La réponse n'est pas un tableau JSON (ni { jobs: [...] } / { items: [...] }).");
    return array;
  } finally {
    clearTimeout(timeout);
  }
}

export const jsonEndpointProvider: JobSourceProvider = {
  type: "JSON_ENDPOINT",

  async searchJobs(config) {
    const url = getEndpointUrl(config);
    const rows = await fetchArray(url);
    return rows
      .map((row, i) => mapGenericRecordToRawJob(row as Record<string, unknown>, i))
      .filter((j): j is RawSourceJob => j !== null);
  },

  async healthCheck(config): Promise<SourceHealthCheck> {
    try {
      const url = getEndpointUrl(config);
      const rows = await fetchArray(url);
      return { ok: true, message: `Endpoint valide — ${rows.length} entrée(s).`, jobCount: rows.length };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Impossible de lire cet endpoint JSON." };
    }
  },
};
