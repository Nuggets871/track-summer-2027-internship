// A CSV file hosted at a stable URL (config: { csvUrl }) — re-fetched and
// re-parsed on every sync, so a spreadsheet that's kept up to date (a public
// Google Sheet published as CSV, for instance) stays current automatically.

import Papa from "papaparse";
import type { JobSourceProvider, RawSourceJob, SourceHealthCheck } from "@/lib/discover/types";
import { mapGenericRecordToRawJob } from "@/lib/discover/providers/generic-mapping";

const FETCH_TIMEOUT_MS = 15_000;

function getCsvUrl(config: Record<string, unknown>): string {
  const url = typeof config.csvUrl === "string" ? config.csvUrl.trim() : "";
  if (!url) throw new Error("csvUrl manquant dans la configuration de cette source CSV.");
  return url;
}

async function fetchRows(url: string): Promise<Record<string, unknown>[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Le fichier CSV a répondu ${res.status}`);
    const text = await res.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    return parsed.data;
  } finally {
    clearTimeout(timeout);
  }
}

export const csvUrlProvider: JobSourceProvider = {
  type: "CSV_URL",

  async searchJobs(config) {
    const url = getCsvUrl(config);
    const rows = await fetchRows(url);
    return rows.map((row, i) => mapGenericRecordToRawJob(row, i)).filter((j): j is RawSourceJob => j !== null);
  },

  async healthCheck(config): Promise<SourceHealthCheck> {
    try {
      const url = getCsvUrl(config);
      const rows = await fetchRows(url);
      return { ok: true, message: `CSV valide — ${rows.length} ligne(s).`, jobCount: rows.length };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Impossible de lire ce CSV." };
    }
  },
};
