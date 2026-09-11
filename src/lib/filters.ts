// Pure, framework-free filtering/sorting helpers for the Opportunities
// table. Kept separate from the table component so "search, filter, sort"
// behavior can be unit-tested without rendering React.

export type FilterableApplication = {
  id: string;
  title: string;
  statusId: string;
  countryId: string | null;
  updatedAt: Date;
  deadline: Date | null;
  company: { name: string };
  jobAnalysis?: { matchScore: number | null } | null;
};

export type ApplicationFilters = {
  search?: string;
  statusIds?: string[];
  countryIds?: string[];
  minMatch?: number;
  needsAnalysis?: boolean;
  deadlineWithinDays?: number;
};

export function filterApplications<T extends FilterableApplication>(
  applications: T[],
  filters: ApplicationFilters,
): T[] {
  let rows = applications;

  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase();
    rows = rows.filter((a) => `${a.company.name} ${a.title}`.toLowerCase().includes(q));
  }
  if (filters.statusIds?.length) {
    rows = rows.filter((a) => filters.statusIds!.includes(a.statusId));
  }
  if (filters.countryIds?.length) {
    rows = rows.filter((a) => a.countryId && filters.countryIds!.includes(a.countryId));
  }
  if (filters.minMatch !== undefined) {
    rows = rows.filter((a) => (a.jobAnalysis?.matchScore ?? -1) >= filters.minMatch!);
  }
  if (filters.needsAnalysis) {
    rows = rows.filter((a) => !a.jobAnalysis);
  }
  if (filters.deadlineWithinDays !== undefined) {
    const now = Date.now();
    const horizon = now + filters.deadlineWithinDays * 24 * 60 * 60 * 1000;
    rows = rows.filter((a) => a.deadline && a.deadline.getTime() >= now && a.deadline.getTime() <= horizon);
  }

  return rows;
}

export type ApplicationSortKey = "updatedAt" | "deadline" | "company" | "match";

const NATURAL_DIRECTION: Record<ApplicationSortKey, "asc" | "desc"> = {
  match: "desc",
  updatedAt: "desc",
  deadline: "asc",
  company: "asc",
};

export function sortApplications<T extends FilterableApplication>(
  applications: T[],
  sort: ApplicationSortKey,
  direction?: "asc" | "desc",
): T[] {
  const factor = (direction ?? NATURAL_DIRECTION[sort]) === "asc" ? 1 : -1;
  return [...applications].sort((a, b) => {
    if (sort === "deadline") {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return (a.deadline.getTime() - b.deadline.getTime()) * factor;
    }
    if (sort === "match") return ((a.jobAnalysis?.matchScore ?? -1) - (b.jobAnalysis?.matchScore ?? -1)) * factor;
    if (sort === "company") return a.company.name.localeCompare(b.company.name) * factor;
    return (a.updatedAt.getTime() - b.updatedAt.getTime()) * factor;
  });
}
