// Discovery/search layer — entirely configuration-free: a provider is
// enabled simply by the presence of its API key in the environment (see
// .env.example). No database config, no per-source settings UI. Queries are
// derived from the candidate profile so the search adapts automatically.

export type NormalizedSearchJob = {
  id: string; // `${providerId}:${sourceJobId}`
  providerId: string;
  source: string; // human label, e.g. "JSearch"
  title: string;
  company: string;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  remoteType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  url: string;
  description: string | null;
  postedAt: string | null; // ISO
  salaryAmount: number | null;
  salaryCurrency: string | null;
  employmentType: string | null;
};

export type SearchQuery = {
  keywords: string;
  countryCode: string | null;
  countryName: string | null;
  remote: boolean;
};

export type ProviderStatus = {
  id: string;
  label: string;
  envVars: string[];
  configured: boolean;
  requiresKey: boolean;
};

export interface JobSearchProvider {
  id: string;
  label: string;
  envVars: string[];
  requiresKey: boolean;
  /** "query" = called once per search query; "catalog" = fetched once, then filtered locally. */
  mode: "query" | "catalog";
  /** Free-tier call budget, if any — used to skip a provider before it 429s. */
  quota?: { limit: number; period: "day" | "month" };
  /** How long a stored response may be served without hitting the API again. */
  cacheTtlSeconds?: number;
  isConfigured(): boolean;
  search(query: SearchQuery, limit: number): Promise<NormalizedSearchJob[]>;
}
