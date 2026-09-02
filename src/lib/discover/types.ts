// The JobSourceProvider abstraction — every real source (Greenhouse, Lever,
// RSS, manual CSV/JSON import) implements this same small interface. Discover
// never talks to a vendor's API shape directly outside of `providers/*`, so
// adding a new source later is a new provider file + one registry entry, not
// a rewrite of the sync engine, dedup, scoring, or UI.

/** A job exactly as fetched from a source, before normalization. Fields the
 * source doesn't provide are simply absent — nothing here is guessed. */
export type RawSourceJob = {
  sourceJobId: string;
  sourceUrl: string;
  title: string;
  companyName: string;
  /** Plain text or HTML — normalize() strips HTML before storing. */
  description: string | null;
  departmentOrTeam: string | null;
  locationText: string | null;
  remoteType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  postedAt: Date | null;
  contractType: string | null;
};

export type SourceHealthCheck = {
  ok: boolean;
  message: string;
  /** Number of jobs the source currently reports, when cheaply knowable. */
  jobCount?: number;
};

export type JobSourceType = "GREENHOUSE" | "LEVER" | "RSS" | "JSON_ENDPOINT" | "CSV_URL" | "MANUAL_IMPORT";

export interface JobSourceProvider {
  readonly type: JobSourceType;
  /** Fetches every job currently listed by this source. Manual/import
   * providers that don't poll a live endpoint return an empty array here —
   * their jobs arrive through importCsv/importJson instead. */
  searchJobs(config: Record<string, unknown>): Promise<RawSourceJob[]>;
  /** Cheap reachability check used by "Sync now" and the Sources list —
   * must never throw, always resolve to a result describing what happened. */
  healthCheck(config: Record<string, unknown>): Promise<SourceHealthCheck>;
}

/** The fully normalized shape persisted to JobListing — every field here is
 * either taken verbatim from the source or derived by a documented,
 * deterministic rule (see normalize.ts / classify.ts). Nothing invented. */
export type NormalizedJob = {
  sourceJobId: string;
  sourceUrl: string;
  title: string;
  companyName: string;
  description: string | null;
  rawText: string;
  cityName: string | null;
  countryName: string | null;
  remoteType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  sector: string | null;
  contractType: string | null;
  isInternship: boolean;
  postedAt: Date | null;
  durationMonths: number | null;
  salaryAmount: number | null;
  salaryCurrency: string | null;
  requiredEducationLevel: string | null;
  requiredExperienceYears: number | null;
  requiredSkills: string[];
  requiredLanguages: string[];
  visaSponsorship: boolean | null;
  tags: string[];
};
