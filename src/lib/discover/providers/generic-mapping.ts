// Shared column/field mapping for every "bring your own data" source: CSV
// URLs, JSON endpoints, one-off CSV paste/upload, and one-off JSON
// paste/upload. All four ultimately need the same thing — turn a loosely-
// shaped record (unknown column names, unknown casing) into a RawSourceJob,
// without ever inventing a value for a column that isn't there.

import type { RawSourceJob } from "@/lib/discover/types";

function firstValue(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    for (const [k, v] of Object.entries(record)) {
      if (k.toLowerCase().replace(/[^a-z0-9]/g, "") === key && typeof v === "string" && v.trim()) {
        return v.trim();
      }
    }
  }
  return null;
}

const KEY_ALIASES = {
  title: ["title", "role", "position", "job", "jobtitle"],
  company: ["company", "companyname", "employer", "org", "organization"],
  location: ["location", "city", "ville", "place"],
  url: ["url", "link", "joburl", "applyurl"],
  description: ["description", "summary", "details"],
  postedAt: ["postedat", "date", "publishedat", "posted"],
  source: ["source"],
  contractType: ["contracttype", "type", "employmenttype"],
};

/** Maps one loosely-shaped record (a CSV row, or a JSON array element) into
 * a RawSourceJob. Returns null when the record is missing what's strictly
 * required (a title and a url) — such rows are skipped, not guessed at. */
export function mapGenericRecordToRawJob(record: Record<string, unknown>, rowIndex: number): RawSourceJob | null {
  const title = firstValue(record, KEY_ALIASES.title);
  const url = firstValue(record, KEY_ALIASES.url);
  if (!title || !url) return null;

  const postedAtRaw = firstValue(record, KEY_ALIASES.postedAt);
  const postedAt = postedAtRaw ? new Date(postedAtRaw) : null;

  return {
    sourceJobId: url || `row-${rowIndex}`,
    sourceUrl: url,
    title,
    companyName: firstValue(record, KEY_ALIASES.company) ?? "Entreprise non renseignée",
    description: firstValue(record, KEY_ALIASES.description),
    departmentOrTeam: null,
    locationText: firstValue(record, KEY_ALIASES.location),
    remoteType: null,
    postedAt: postedAt && !Number.isNaN(postedAt.getTime()) ? postedAt : null,
    contractType: firstValue(record, KEY_ALIASES.contractType),
  };
}
