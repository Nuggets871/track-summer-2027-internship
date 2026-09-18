import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { clamp } from "@/lib/utils";

/**
 * Ingestion of external internship offers (used by the MCP server for
 * ChatGPT). Offers are staged in the "Pistes" inbox — not turned into
 * opportunities directly — so they can be reviewed and triaged by hand.
 * Deduplication is by normalized URL, then by company + title, against both
 * the inbox and the opportunities already tracked. The database is never
 * exposed to the caller.
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
  city: string | null;
  status: string;
  source: string | null;
  createdAt: Date;
};

export const MAX_INTERNSHIPS_PER_CALL = 50;

const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "À trier",
  CONVERTED: "Convertie",
  DISCARDED: "Écartée",
};

export function leadStatusLabel(status: string): string {
  return LEAD_STATUS_LABELS[status] ?? status;
}

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

function duplicateKey(company: string, title: string): string {
  return `${company.toLowerCase()}::${title.toLowerCase()}`;
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
 * Stages offers in the "Pistes" inbox. Never throws for a single bad row:
 * every input yields a `created`, `skipped` (already present here or among
 * opportunities) or `rejected` (invalid fields) result.
 */
export async function addInternships(items: InternshipInput[]): Promise<InternshipIngestResult[]> {
  const batch = items.slice(0, MAX_INTERNSHIPS_PER_CALL);

  const [leads, applications] = await Promise.all([
    prisma.lead.findMany({ select: { id: true, url: true, company: true, role: true } }),
    prisma.application.findMany({
      where: { deletedAt: null },
      select: { id: true, jobUrl: true, title: true, company: { select: { name: true } } },
    }),
  ]);

  const idByUrl = new Map<string, string>();
  const idByCompanyTitle = new Map<string, string>();
  for (const lead of leads) {
    if (lead.url) idByUrl.set(normalizeJobUrl(lead.url), lead.id);
    if (lead.company && lead.role) idByCompanyTitle.set(duplicateKey(lead.company, lead.role), lead.id);
  }
  for (const application of applications) {
    if (application.jobUrl) idByUrl.set(normalizeJobUrl(application.jobUrl), application.id);
    idByCompanyTitle.set(duplicateKey(application.company.name, application.title), application.id);
  }

  const seenThisBatch = new Set<string>();
  const results: InternshipIngestResult[] = [];

  for (const input of batch) {
    const validated = validateInternship(input);
    if (!validated.ok) {
      results.push({ status: "rejected", id: null, company: validated.company, title: validated.title, url: validated.url, reason: validated.reason });
      continue;
    }

    const { company, title, url, country, city, description, source } = validated.value;
    const normalizedUrl = normalizeJobUrl(url);
    const companyTitleKey = duplicateKey(company, title);

    if (seenThisBatch.has(normalizedUrl)) {
      results.push({ status: "skipped", id: null, company, title, url, reason: "Doublon dans la même requête" });
      continue;
    }

    const duplicateId = idByUrl.get(normalizedUrl) ?? idByCompanyTitle.get(companyTitleKey);
    if (duplicateId) {
      seenThisBatch.add(normalizedUrl);
      results.push({ status: "skipped", id: duplicateId, company, title, url, reason: "Offre déjà enregistrée (pistes ou opportunités)" });
      continue;
    }

    const lead = await prisma.lead.create({
      data: {
        url,
        company,
        role: title,
        country,
        city,
        description,
        source: source ?? "ChatGPT",
        status: "NEW",
      },
    });

    idByUrl.set(normalizedUrl, lead.id);
    idByCompanyTitle.set(companyTitleKey, lead.id);
    seenThisBatch.add(normalizedUrl);

    results.push({ status: "created", id: lead.id, company, title, url });
  }

  await logMcpActivity("addInternships", {
    created: results.filter((result) => result.status === "created").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    rejected: results.filter((result) => result.status === "rejected").length,
    detail: JSON.stringify(results).slice(0, 8000),
  });

  revalidatePath("/inbox");
  return results;
}

/**
 * Lists the offers staged in the inbox, newest first, for the caller to check
 * what already exists before adding more. Optional case-insensitive `query`
 * filter on company/title, and `status` filter (key or French label).
 */
export async function listInternships(options: { query?: string | null; status?: string | null; limit?: number | null } = {}): Promise<InternshipSummary[]> {
  const requestedLimit = options.limit ?? 50;
  const limit = clamp(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit as number) : 50, 1, 200);

  const rows = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });

  const query = options.query?.trim().toLowerCase();
  const status = options.status?.trim().toLowerCase();

  const filtered = rows
    .filter((row) => !query || row.company?.toLowerCase().includes(query) || row.role?.toLowerCase().includes(query))
    .filter((row) => {
      if (!status) return true;
      return row.status.toLowerCase().includes(status) || leadStatusLabel(row.status).toLowerCase().includes(status);
    })
    .slice(0, limit);

  await logMcpActivity("listInternships", { listed: filtered.length });

  return filtered.map((row) => ({
    id: row.id,
    company: row.company ?? "",
    title: row.role ?? "",
    url: row.url,
    country: row.country,
    city: row.city,
    status: leadStatusLabel(row.status),
    source: row.source,
    createdAt: row.createdAt,
  }));
}

type McpActivityInput = {
  created?: number;
  skipped?: number;
  rejected?: number;
  listed?: number;
  detail?: string;
};

async function logMcpActivity(tool: string, data: McpActivityInput): Promise<void> {
  try {
    await prisma.mcpActivity.create({ data: { tool, ...data } });
  } catch {
    // Best-effort: monitoring must never break ingestion.
  }
}
