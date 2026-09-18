import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureApplicationPipelineStages } from "@/lib/data/pipeline-stages";
import { logActivity } from "@/lib/data/activity";

/**
 * Ingestion of external internship offers (used by the MCP server for
 * ChatGPT). Writes through the same Application/Company/Country tables as the
 * rest of the app — no direct database access is ever exposed to the caller.
 * Deduplication is by normalized URL, then by company + title, so re-running
 * the same discovery never creates a second opportunity.
 */

export type InternshipInput = {
  company?: string | null;
  title?: string | null;
  url?: string | null;
  country?: string | null;
  city?: string | null;
  description?: string | null;
  source?: string | null;
};

export type InternshipIngestStatus = "created" | "skipped" | "rejected";

export type InternshipIngestResult = {
  status: InternshipIngestStatus;
  id: string | null;
  company: string;
  title: string;
  url: string;
  reason?: string;
};

export type InternshipSummary = {
  id: string;
  company: string;
  title: string;
  url: string | null;
  country: string | null;
  status: string;
};

export const MAX_INTERNSHIPS_PER_CALL = 50;

// Marketing/attribution params that don't change which posting a URL points to.
// Everything else (e.g. `gh_jid`) is kept, so distinct offers are never merged.
const TRACKING_PARAMS = new Set([
  "ref", "referrer", "referral", "source", "src", "fbclid", "gclid", "msclkid",
  "mc_cid", "mc_eid", "igshid", "trk", "trackingid", "gh_src", "lever-source",
  "lever-origin", "utm_id", "utm_name", "utm_reader", "utm_social", "utm_social-type",
]);

/** Normalizes host/path/query so two links to the same posting compare equal
 * while keeping meaningful query parameters that carry the job id. */
export function normalizeJobUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.hash = "";
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const path = url.pathname.replace(/\/+$/, "");
    const params = [...url.searchParams.entries()]
      .filter(([key]) => {
        const lower = key.toLowerCase();
        return !TRACKING_PARAMS.has(lower) && !lower.startsWith("utm_");
      })
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const search = params.length ? `?${params.map(([key, value]) => `${key}=${value}`).join("&")}` : "";
    return `${host}${path}${search}`.toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}

type ValidatedInternship = {
  company: string;
  title: string;
  url: string;
  country: string | null;
  city: string | null;
  description: string | null;
  source: string | null;
};

function validateInternship(
  input: InternshipInput,
): { ok: true; value: ValidatedInternship } | { ok: false; company: string; title: string; url: string; reason: string } {
  const company = (input.company ?? "").trim();
  const title = (input.title ?? "").trim();
  const url = (input.url ?? "").trim();

  if (!company) return { ok: false, company, title, url, reason: "Entreprise manquante" };
  if (!title) return { ok: false, company, title, url, reason: "Intitulé manquant" };
  if (!url) return { ok: false, company, title, url, reason: "URL manquante" };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, company, title, url, reason: "URL invalide" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, company, title, url, reason: "URL non http(s)" };
  }

  return {
    ok: true,
    value: {
      company,
      title,
      url,
      country: input.country?.trim() || null,
      city: input.city?.trim() || null,
      description: input.description?.trim() || null,
      source: input.source?.trim() || null,
    },
  };
}

/**
 * Adds offers as opportunities on the "Sauvegardée" stage. Never throws for a
 * single bad row: every input yields a `created`, `skipped` (already present)
 * or `rejected` result so the caller can report per-offer.
 */
export async function addInternships(items: InternshipInput[]): Promise<InternshipIngestResult[]> {
  const stages = await ensureApplicationPipelineStages();
  const savedStage = stages.find((stage) => stage.key === "SAVED");
  if (!savedStage) throw new Error('Statut "Sauvegardée" introuvable.');

  const existing = await prisma.application.findMany({
    where: { deletedAt: null },
    select: { id: true, jobUrl: true, title: true, company: { select: { name: true } } },
  });

  const idByUrl = new Map<string, string>();
  const idByCompanyTitle = new Map<string, string>();
  for (const row of existing) {
    if (row.jobUrl) idByUrl.set(normalizeJobUrl(row.jobUrl), row.id);
    idByCompanyTitle.set(`${row.company.name.toLowerCase()}::${row.title.toLowerCase()}`, row.id);
  }

  const seenThisBatch = new Set<string>();
  const results: InternshipIngestResult[] = [];

  for (const input of items.slice(0, MAX_INTERNSHIPS_PER_CALL)) {
    const validated = validateInternship(input);
    if (!validated.ok) {
      results.push({ status: "rejected", id: null, company: validated.company, title: validated.title, url: validated.url, reason: validated.reason });
      continue;
    }

    const { company, title, url, country, city, description, source } = validated.value;
    const normalizedUrl = normalizeJobUrl(url);
    const companyTitleKey = `${company.toLowerCase()}::${title.toLowerCase()}`;

    if (seenThisBatch.has(normalizedUrl)) {
      results.push({ status: "skipped", id: null, company, title, url, reason: "Doublon dans la même requête" });
      continue;
    }

    const duplicateId = idByUrl.get(normalizedUrl) ?? idByCompanyTitle.get(companyTitleKey);
    if (duplicateId) {
      seenThisBatch.add(normalizedUrl);
      results.push({ status: "skipped", id: duplicateId, company, title, url, reason: "Offre déjà enregistrée" });
      continue;
    }

    const companyRow =
      (await prisma.company.findFirst({ where: { name: company } })) ??
      (await prisma.company.create({ data: { name: company } }));

    let countryId: string | undefined;
    if (country) {
      const countryRow = await prisma.country.upsert({
        where: { name: country },
        create: { name: country },
        update: {},
      });
      countryId = countryRow.id;
    }

    let cityId: string | undefined;
    if (city && countryId) {
      const cityRow = await prisma.city.upsert({
        where: { name_countryId: { name: city, countryId } },
        create: { name: city, countryId },
        update: {},
      });
      cityId = cityRow.id;
    }

    const application = await prisma.application.create({
      data: {
        title,
        companyId: companyRow.id,
        countryId,
        cityId,
        jobUrl: url,
        source: source ?? "ChatGPT",
        statusId: savedStage.id,
        discoveredAt: new Date(),
        notes: description,
        nextAction: "Analyser l'offre",
      },
    });

    await logActivity(application.id, "CREATED", "Opportunité ajoutée depuis ChatGPT (MCP)");

    idByUrl.set(normalizedUrl, application.id);
    idByCompanyTitle.set(companyTitleKey, application.id);
    seenThisBatch.add(normalizedUrl);

    results.push({ status: "created", id: application.id, company, title, url });
  }

  revalidatePath("/", "layout");
  revalidatePath("/opportunities");
  return results;
}

/**
 * Lists stored opportunities, newest first, for the caller to check what is
 * already tracked before adding more. Optional case-insensitive `query`
 * filter on company/title, and `status` filter on the pipeline label.
 */
export async function listInternships(options: { query?: string | null; status?: string | null; limit?: number | null } = {}): Promise<InternshipSummary[]> {
  const requestedLimit = options.limit ?? 50;
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit as number) : 50, 1), 200);

  const rows = await prisma.application.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      jobUrl: true,
      company: { select: { name: true } },
      country: { select: { name: true } },
      status: { select: { label: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const query = options.query?.trim().toLowerCase();
  const status = options.status?.trim().toLowerCase();

  return rows
    .filter((row) => !query || row.company.name.toLowerCase().includes(query) || row.title.toLowerCase().includes(query))
    .filter((row) => !status || row.status.label.toLowerCase().includes(status))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      company: row.company.name,
      title: row.title,
      url: row.jobUrl,
      country: row.country?.name ?? null,
      status: row.status.label,
    }));
}
