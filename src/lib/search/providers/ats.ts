import { htmlToText } from "@/lib/job-extraction";
import { ATS_COMPANIES, type AtsCompany } from "@/lib/search/ats-companies";
import { looksLikeInternship } from "@/lib/search/classify";
import type { JobSearchProvider, NormalizedSearchJob, SearchQuery } from "@/lib/search/types";

const TIMEOUT_MS = 15_000;
const MAX_JOBS_PER_COMPANY = 400;

function endpoint(company: AtsCompany): string {
  switch (company.provider) {
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${company.token}/jobs`;
    case "lever":
      return `https://api.lever.co/v0/postings/${company.token}?mode=json`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${company.token}`;
  }
}

async function fetchCompany(company: AtsCompany): Promise<NormalizedSearchJob[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(endpoint(company), { signal: controller.signal });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return mapCompany(company, data);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function base(company: AtsCompany, id: string): Pick<NormalizedSearchJob, "id" | "providerId" | "source" | "company" | "country" | "countryCode" | "salaryAmount" | "salaryCurrency"> {
  return {
    id: `ats:${company.provider}:${company.token}:${id}`,
    providerId: "ats",
    source: company.name,
    company: company.name,
    country: company.countries[0] ?? null,
    countryCode: null,
    salaryAmount: null,
    salaryCurrency: null,
  };
}

function mapCompany(company: AtsCompany, data: unknown): NormalizedSearchJob[] {
  const rows: NormalizedSearchJob[] = [];

  if (company.provider === "greenhouse") {
    const jobs = (data as { jobs?: Array<Record<string, unknown>> })?.jobs ?? [];
    for (const job of jobs.slice(0, MAX_JOBS_PER_COMPANY)) {
      const title = String(job.title ?? "");
      if (!title || !looksLikeInternship(title)) continue;
      const location = (job.location as { name?: string } | undefined)?.name ?? null;
      rows.push({
        ...base(company, String(job.id ?? title)),
        title,
        city: location,
        remoteType: /remote/i.test(location ?? "") ? "REMOTE" : null,
        url: String(job.absolute_url ?? ""),
        description: null,
        postedAt: (job.updated_at as string | undefined) ?? null,
        employmentType: null,
      });
    }
  }

  if (company.provider === "lever") {
    const jobs = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
    for (const job of jobs.slice(0, MAX_JOBS_PER_COMPANY)) {
      const title = String(job.text ?? "");
      const description = job.descriptionPlain ? String(job.descriptionPlain) : null;
      if (!title || !looksLikeInternship(`${title} ${description ?? ""}`)) continue;
      const categories = (job.categories as Record<string, string> | undefined) ?? {};
      rows.push({
        ...base(company, String(job.id ?? title)),
        title,
        city: categories.location ?? null,
        remoteType: /remote/i.test(job.workplaceType ? String(job.workplaceType) : "") ? "REMOTE" : null,
        url: String(job.hostedUrl ?? ""),
        description: description ? description.slice(0, 8_000) : null,
        postedAt: job.createdAt ? new Date(Number(job.createdAt)).toISOString() : null,
        employmentType: categories.commitment ?? null,
      });
    }
  }

  if (company.provider === "ashby") {
    const jobs = (data as { jobs?: Array<Record<string, unknown>> })?.jobs ?? [];
    for (const job of jobs.slice(0, MAX_JOBS_PER_COMPANY)) {
      const title = String(job.title ?? "");
      const rawDescription = job.descriptionPlain ?? job.descriptionHtml;
      const description = rawDescription ? htmlToText(String(rawDescription)).slice(0, 8_000) : null;
      if (!title || !looksLikeInternship(`${title} ${description ?? ""}`)) continue;
      rows.push({
        ...base(company, String(job.id ?? title)),
        title,
        city: job.location ? String(job.location) : null,
        remoteType: job.isRemote ? "REMOTE" : null,
        url: String(job.jobUrl ?? ""),
        description,
        postedAt: (job.publishedDate as string | undefined) ?? null,
        employmentType: job.employmentType ? String(job.employmentType) : null,
      });
    }
  }

  return rows.filter((row) => row.url);
}

export const atsProvider: JobSearchProvider = {
  id: "ats",
  label: "Entreprises ciblées (Greenhouse / Lever / Ashby)",
  envVars: [],
  requiresKey: false,
  mode: "catalog",
  isConfigured: () => ATS_COMPANIES.length > 0,
  async search(_query: SearchQuery, limit: number): Promise<NormalizedSearchJob[]> {
    const results = await Promise.all(ATS_COMPANIES.map((company) => fetchCompany(company)));
    return results.flat().slice(0, limit);
  },
};
