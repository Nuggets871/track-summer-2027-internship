// Lever's public Postings API — no API key required, genuinely public:
// https://github.com/lever/postings-api
//
// Scoped to one company's postings at a time (config: { companyToken }),
// same constraint as Greenhouse: there is no global cross-company search.

import type { JobSourceProvider, RawSourceJob, SourceHealthCheck } from "@/lib/discover/types";
import { parseDateSafe } from "@/lib/discover/dates";

const FETCH_TIMEOUT_MS = 15_000;

type LeverPosting = {
  id: string;
  text: string; // title
  hostedUrl: string;
  createdAt: number; // epoch ms
  descriptionPlain?: string;
  descriptionBodyPlain?: string;
  categories?: { location?: string; team?: string; department?: string; commitment?: string };
  workplaceType?: string; // "remote" | "hybrid" | "on-site"
  lists?: { text: string; content: string }[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Lever a répondu ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function getCompanyToken(config: Record<string, unknown>): string {
  const token = typeof config.companyToken === "string" ? config.companyToken.trim() : "";
  if (!token) throw new Error("companyToken manquant dans la configuration de cette source Lever.");
  return token;
}

function remoteTypeFromWorkplace(value: string | undefined): RawSourceJob["remoteType"] {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v.includes("remote")) return "REMOTE";
  if (v.includes("hybrid")) return "HYBRID";
  if (v.includes("on-site") || v.includes("onsite")) return "ONSITE";
  return null;
}

function buildDescription(posting: LeverPosting): string | null {
  const parts = [posting.descriptionPlain, posting.descriptionBodyPlain, ...(posting.lists ?? []).map((l) => `${l.text}\n${l.content}`)];
  const text = parts.filter(Boolean).join("\n\n");
  return text.trim() || null;
}

export const leverProvider: JobSourceProvider = {
  type: "LEVER",

  async searchJobs(config) {
    const companyToken = getCompanyToken(config);
    const postings = await fetchJson<LeverPosting[]>(
      `https://api.lever.co/v0/postings/${encodeURIComponent(companyToken)}?mode=json`,
    );

    const companyName = typeof config.companyLabel === "string" && config.companyLabel ? config.companyLabel : companyToken;

    return postings.map(
      (p): RawSourceJob => ({
        sourceJobId: p.id,
        sourceUrl: p.hostedUrl,
        title: p.text,
        companyName,
        description: buildDescription(p),
        departmentOrTeam: p.categories?.team ?? p.categories?.department ?? null,
        locationText: p.categories?.location ?? null,
        remoteType: remoteTypeFromWorkplace(p.workplaceType),
        postedAt: parseDateSafe(p.createdAt),
        contractType: p.categories?.commitment ?? null,
      }),
    );
  },

  async healthCheck(config): Promise<SourceHealthCheck> {
    try {
      const companyToken = getCompanyToken(config);
      const postings = await fetchJson<LeverPosting[]>(
        `https://api.lever.co/v0/postings/${encodeURIComponent(companyToken)}?mode=json&limit=1`,
      );
      return { ok: true, message: "Connecté à Lever.", jobCount: postings.length };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Impossible de joindre Lever." };
    }
  },
};
