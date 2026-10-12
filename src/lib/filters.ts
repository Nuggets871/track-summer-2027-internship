// Pure, framework-free filtering/sorting helpers for the Opportunities
// table. Kept separate from the table component so "search, filter, sort"
// behavior can be unit-tested without rendering React.

export type FilterableApplication = {
  id: string;
  title: string;
  statusId: string;
  countryId: string | null;
  createdAt: Date;
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
  /** Which timestamp the date range applies to. Defaults to updatedAt. */
  dateField?: "createdAt" | "updatedAt";
  /** Inclusive lower bound, "YYYY-MM-DD". */
  dateFrom?: string;
  /** Inclusive upper bound, "YYYY-MM-DD". */
  dateTo?: string;
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
  if (filters.dateFrom || filters.dateTo) {
    const field = filters.dateField === "createdAt" ? "createdAt" : "updatedAt";
    const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`).getTime() : null;
    rows = rows.filter((a) => {
      const time = a[field].getTime();
      if (from !== null && time < from) return false;
      if (to !== null && time > to) return false;
      return true;
    });
  }

  return rows;
}

export type ApplicationSortKey = "updatedAt" | "createdAt" | "deadline" | "company" | "match";

const NATURAL_DIRECTION: Record<ApplicationSortKey, "asc" | "desc"> = {
  match: "desc",
  updatedAt: "desc",
  createdAt: "desc",
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
    if (sort === "createdAt") return (a.createdAt.getTime() - b.createdAt.getTime()) * factor;
    return (a.updatedAt.getTime() - b.updatedAt.getTime()) * factor;
  });
}
