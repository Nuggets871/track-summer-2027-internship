import type { JobSourceProvider, JobSourceType } from "@/lib/discover/types";
import { greenhouseProvider } from "@/lib/discover/providers/greenhouse";
import { leverProvider } from "@/lib/discover/providers/lever";
import { rssProvider } from "@/lib/discover/providers/rss";
import { jsonEndpointProvider } from "@/lib/discover/providers/json-endpoint";
import { csvUrlProvider } from "@/lib/discover/providers/csv-url";
import { manualProvider } from "@/lib/discover/providers/manual";
import { adzunaProvider } from "@/lib/discover/providers/adzuna";
import { jsearchProvider } from "@/lib/discover/providers/jsearch";
import { reedProvider } from "@/lib/discover/providers/reed";
import { joobleProvider } from "@/lib/discover/providers/jooble";

const REGISTRY: Record<JobSourceType, JobSourceProvider> = {
  GREENHOUSE: greenhouseProvider,
  LEVER: leverProvider,
  RSS: rssProvider,
  JSON_ENDPOINT: jsonEndpointProvider,
  CSV_URL: csvUrlProvider,
  MANUAL_IMPORT: manualProvider,
  ADZUNA: adzunaProvider,
  JSEARCH: jsearchProvider,
  REED: reedProvider,
  JOOBLE: joobleProvider,
};

/** The single place that maps a JobSource.type string to its provider —
 * adding a new source later means adding one entry here and one file next
 * to it, nothing else in Discover needs to change. */
export function getProvider(type: string): JobSourceProvider {
  const provider = REGISTRY[type as JobSourceType];
  if (!provider) throw new Error(`Type de source inconnu : ${type}`);
  return provider;
}

export const SOURCE_TYPE_LABELS: Record<JobSourceType, string> = {
  GREENHOUSE: "Greenhouse (page carrières d'une entreprise)",
  LEVER: "Lever (page carrières d'une entreprise)",
  RSS: "Flux RSS",
  JSON_ENDPOINT: "Endpoint JSON",
  CSV_URL: "CSV (URL)",
  MANUAL_IMPORT: "Import manuel",
  ADZUNA: "Adzuna (clé API)",
  JSEARCH: "JSearch / RapidAPI (clé API)",
  REED: "Reed.co.uk — UK (clé API)",
  JOOBLE: "Jooble (clé API)",
};

/** Source types that require the user to hold a real API key — used by the
 * Sources UI to render the right fields and to remind that the key stays
 * local (stored in JobSource.config, never sent back to the browser). */
export const API_KEY_SOURCE_TYPES: JobSourceType[] = ["ADZUNA", "JSEARCH", "REED", "JOOBLE"];
