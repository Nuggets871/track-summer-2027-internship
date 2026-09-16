import type { JobSearchProvider, NormalizedSearchJob, SearchQuery } from "@/lib/search/types";

const ENDPOINT = "https://google.serper.dev/search";
const TIMEOUT_MS = 15_000;

type SerperOrganic = { title?: string; link?: string; snippet?: string };

/**
 * General web search (Google SERP). Unlike the aggregators it returns *links*
 * rather than structured postings — its value is reaching sites with no API
 * (JobTeaser, company career pages). Results are shown as leads to analyze.
 */
export const serperProvider: JobSearchProvider = {
  id: "serper",
  label: "Recherche web (Serper)",
  envVars: ["SERPER_API_KEY"],
  requiresKey: true,
  mode: "query",
  isConfigured: () => Boolean(process.env.SERPER_API_KEY),

  async search(query: SearchQuery, limit: number): Promise<NormalizedSearchJob[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return [];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let payload: { organic?: SerperOrganic[] };
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          q: query.keywords,
          num: Math.min(limit, 20),
          ...(query.countryCode ? { gl: query.countryCode.toLowerCase() } : {}),
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Serper ${res.status}`);
      payload = (await res.json()) as { organic?: SerperOrganic[] };
    } finally {
      clearTimeout(timeout);
    }

    return (payload.organic ?? [])
      .map((result): NormalizedSearchJob | null => {
        if (!result.link || !result.title) return null;
        let company = "Web";
        try {
          company = new URL(result.link).hostname.replace(/^www\./, "");
        } catch {
          /* keep default */
        }
        return {
          id: `serper:${result.link}`,
          providerId: "serper",
          source: "Web",
          title: result.title,
          company,
          city: null,
          country: null,
          countryCode: query.countryCode,
          remoteType: null,
          url: result.link,
          description: result.snippet ?? null,
          postedAt: null,
          salaryAmount: null,
          salaryCurrency: null,
          employmentType: null,
        };
      })
      .filter((job): job is NormalizedSearchJob => job !== null)
      .slice(0, limit);
  },
};
