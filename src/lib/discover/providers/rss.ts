// Generic RSS/Atom provider — for a company career-page feed, a job-board
// feed, or any other real feed the user points it at (config: { feedUrl }).
// This is deliberately generic rather than a bespoke per-site scraper: it
// only works when a feed genuinely exists and is well-formed, and it never
// simulates results when it doesn't.

import Parser from "rss-parser";
import type { JobSourceProvider, RawSourceJob, SourceHealthCheck } from "@/lib/discover/types";

const FETCH_TIMEOUT_MS = 15_000;

function getFeedUrl(config: Record<string, unknown>): string {
  const url = typeof config.feedUrl === "string" ? config.feedUrl.trim() : "";
  if (!url) throw new Error("feedUrl manquant dans la configuration de cette source RSS.");
  return url;
}

async function parseFeed(feedUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const parser = new Parser({ timeout: FETCH_TIMEOUT_MS });
    const res = await fetch(feedUrl, { signal: controller.signal });
    if (!res.ok) throw new Error(`Le flux a répondu ${res.status}`);
    const xml = await res.text();
    return await parser.parseString(xml);
  } finally {
    clearTimeout(timeout);
  }
}

function guessCompanyFromFeedTitle(feedTitle: string | undefined, fallback: string): string {
  if (!feedTitle) return fallback;
  return feedTitle.replace(/\s*[-–|]\s*(jobs|careers|internships).*/i, "").trim() || fallback;
}

export const rssProvider: JobSourceProvider = {
  type: "RSS",

  async searchJobs(config) {
    const feedUrl = getFeedUrl(config);
    const feed = await parseFeed(feedUrl);
    const companyLabel = typeof config.companyLabel === "string" && config.companyLabel ? config.companyLabel : null;
    const companyName = companyLabel ?? guessCompanyFromFeedTitle(feed.title, new URL(feedUrl).hostname);

    return (feed.items ?? [])
      .filter((item) => item.link)
      .map(
        (item): RawSourceJob => ({
          sourceJobId: item.guid || item.link || item.title || crypto.randomUUID(),
          sourceUrl: item.link!,
          title: item.title ?? "Offre sans titre",
          companyName,
          description: item.contentSnippet ?? item.content ?? item.summary ?? null,
          departmentOrTeam: (item.categories ?? []).join(", ") || null,
          locationText: null,
          remoteType: null,
          postedAt: item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null,
          contractType: null,
        }),
      );
  },

  async healthCheck(config): Promise<SourceHealthCheck> {
    try {
      const feedUrl = getFeedUrl(config);
      const feed = await parseFeed(feedUrl);
      const count = feed.items?.length ?? 0;
      return { ok: true, message: `Flux valide — ${count} entrée(s).`, jobCount: count };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Impossible de lire ce flux RSS." };
    }
  },
};
