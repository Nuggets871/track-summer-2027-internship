// One-off CSV/JSON import (paste or upload) — shares the exact same
// mapping/normalize/dedup/score/index pipeline as the polling providers, so
// an imported job is a first-class Discover listing, not a second-class
// citizen. There is nothing to "sync" for these afterwards; re-importing the
// same file just updates the same rows (matched by URL).

import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { mapGenericRecordToRawJob } from "@/lib/discover/providers/generic-mapping";
import { normalizeRawJob } from "@/lib/discover/normalize";
import { ingestNormalizedJob } from "@/lib/discover/sync";

export type ImportResult = { created: number; updated: number; duplicate: number; skipped: number; sourceId: string };

async function getOrCreateManualSource(): Promise<{ id: string }> {
  const existing = await prisma.jobSource.findFirst({ where: { type: "MANUAL_IMPORT" } });
  if (existing) return existing;
  return prisma.jobSource.create({
    data: { type: "MANUAL_IMPORT", name: "Import manuel", config: "{}", status: "OK" },
  });
}

async function ingestRecords(records: Record<string, unknown>[]): Promise<ImportResult> {
  const source = await getOrCreateManualSource();
  let created = 0;
  let updated = 0;
  let duplicate = 0;
  let skipped = 0;

  for (let i = 0; i < records.length; i++) {
    const raw = mapGenericRecordToRawJob(records[i], i);
    if (!raw) {
      skipped += 1;
      continue;
    }
    const normalized = normalizeRawJob(raw);
    const outcome = await ingestNormalizedJob(source.id, normalized);
    if (outcome === "created") created += 1;
    else if (outcome === "updated") updated += 1;
    else duplicate += 1;
  }

  const jobCount = await prisma.jobListing.count({ where: { sourceId: source.id, status: "ACTIVE" } });
  await prisma.jobSource.update({ where: { id: source.id }, data: { jobCount, lastSyncedAt: new Date(), status: "OK" } });

  return { created, updated, duplicate, skipped, sourceId: source.id };
}

export async function importJobsFromCsv(csvText: string): Promise<ImportResult> {
  const parsed = Papa.parse<Record<string, unknown>>(csvText, { header: true, skipEmptyLines: true });
  return ingestRecords(parsed.data);
}

export async function importJobsFromJson(jsonText: string): Promise<ImportResult> {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error("JSON invalide.");
  }
  const array = Array.isArray(data) ? data : Array.isArray((data as Record<string, unknown>)?.jobs) ? (data as Record<string, unknown>).jobs : null;
  if (!Array.isArray(array)) throw new Error("Le JSON doit être un tableau d'offres (ou { jobs: [...] }).");
  return ingestRecords(array as Record<string, unknown>[]);
}
