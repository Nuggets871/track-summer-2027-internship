// Keeps the JobListingFts virtual table (see the discover_job_aggregation
// migration) in sync with JobListing, and builds MATCH queries for it.
// SQLite FTS5 isn't a Prisma model — it's a real, standard SQLite feature
// used through raw SQL, not a homemade "search engine".

import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

export type FtsRow = {
  id: string;
  title: string;
  companyName: string;
  description: string | null;
  cityName: string | null;
  countryName: string | null;
  sector: string | null;
  requiredSkills: string | null; // JSON string, as stored on JobListing
  tags: string | null; // JSON string, as stored on JobListing
};

export async function upsertFtsRow(row: FtsRow): Promise<void> {
  const skills = safeJsonParse<string[]>(row.requiredSkills, []).join(" ");
  const tags = safeJsonParse<string[]>(row.tags, []).join(" ");
  await prisma.$executeRaw`DELETE FROM "JobListingFts" WHERE id = ${row.id}`;
  await prisma.$executeRaw`
    INSERT INTO "JobListingFts" (id, title, companyName, description, cityName, countryName, sector, skills, tags)
    VALUES (${row.id}, ${row.title}, ${row.companyName}, ${row.description ?? ""}, ${row.cityName ?? ""}, ${row.countryName ?? ""}, ${row.sector ?? ""}, ${skills}, ${tags})
  `;
}

export async function deleteFtsRow(id: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "JobListingFts" WHERE id = ${id}`;
}

/** Turns free-text ("finance london summer") into an FTS5 MATCH expression
 * requiring every term to appear somewhere in the indexed columns — bare
 * terms are implicitly ANDed by FTS5, which is exactly "matches several
 * elements" from the brief. Each term is quoted so punctuation in the query
 * can't be interpreted as FTS5 query syntax. */
export function buildMatchQuery(query: string): string | null {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/"/g, ""))
    .filter(Boolean);
  if (terms.length === 0) return null;
  return terms.map((t) => `"${t}"*`).join(" ");
}

/** Returns the ids of listings matching the free-text query, most relevant
 * first — callers combine this with normal Prisma `where` filters on the id
 * list. Returns null when there's no query (caller should skip FTS entirely
 * rather than search for an empty string). */
export async function searchListingIds(query: string, limit = 2000): Promise<string[] | null> {
  const matchQuery = buildMatchQuery(query);
  if (!matchQuery) return null;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "JobListingFts" WHERE "JobListingFts" MATCH ${matchQuery} ORDER BY rank LIMIT ${limit}
  `;
  return rows.map((r) => r.id);
}
