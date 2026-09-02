import { describe, expect, it } from "vitest";
import { filterApplications, sortApplications, type FilterableApplication } from "@/lib/filters";

function makeApp(overrides: Partial<FilterableApplication> & { id: string }): FilterableApplication {
  return {
    title: "Summer Intern",
    statusId: "status-1",
    countryId: "country-1",
    updatedAt: new Date("2026-01-01"),
    deadline: null,
    company: { name: "Acme" },
    jobAnalysis: { matchScore: 50 },
    ...overrides,
  };
}

describe("filterApplications", () => {
  const apps = [
    makeApp({ id: "1", title: "M&A Summer Analyst", company: { name: "Meridian Bank" }, statusId: "sent", countryId: "gb" }),
    makeApp({ id: "2", title: "Data Science Intern", company: { name: "Vertex Analytics" }, statusId: "interview", countryId: "sg" }),
    makeApp({ id: "3", title: "Growth Intern", company: { name: "Lumen Digital" }, statusId: "offer", countryId: "ca" }),
  ];

  it("returns everything when no filter is applied", () => {
    expect(filterApplications(apps, {})).toHaveLength(3);
  });

  it("searches across company name and title, case-insensitively", () => {
    expect(filterApplications(apps, { search: "meridian" }).map((a) => a.id)).toEqual(["1"]);
    expect(filterApplications(apps, { search: "INTERN" }).map((a) => a.id)).toEqual(["2", "3"]);
    expect(filterApplications(apps, { search: "nonexistent" })).toHaveLength(0);
  });

  it("filters by one or more statuses", () => {
    expect(filterApplications(apps, { statusIds: ["sent"] }).map((a) => a.id)).toEqual(["1"]);
    expect(filterApplications(apps, { statusIds: ["sent", "offer"] }).map((a) => a.id)).toEqual(["1", "3"]);
  });

  it("filters by country", () => {
    expect(filterApplications(apps, { countryIds: ["sg"] }).map((a) => a.id)).toEqual(["2"]);
  });

  it("filters by minimum match score", () => {
    const scored = [
      makeApp({ id: "1", jobAnalysis: { matchScore: 90 } }),
      makeApp({ id: "2", jobAnalysis: { matchScore: 50 } }),
      makeApp({ id: "3", jobAnalysis: null }),
    ];
    expect(filterApplications(scored, { minMatch: 80 }).map((a) => a.id)).toEqual(["1"]);
  });

  it("filters opportunities that still need analysis", () => {
    const scored = [makeApp({ id: "1", jobAnalysis: { matchScore: 90 } }), makeApp({ id: "2", jobAnalysis: null })];
    expect(filterApplications(scored, { needsAnalysis: true }).map((a) => a.id)).toEqual(["2"]);
  });

  it("combines multiple filters with AND semantics", () => {
    expect(filterApplications(apps, { search: "intern", countryIds: ["ca"] }).map((a) => a.id)).toEqual(["3"]);
  });
});

describe("sortApplications", () => {
  const apps = [
    makeApp({ id: "1", company: { name: "Zeta" }, deadline: new Date("2026-09-10"), jobAnalysis: { matchScore: 40 }, updatedAt: new Date("2026-01-01") }),
    makeApp({ id: "2", company: { name: "Alpha" }, deadline: new Date("2026-08-01"), jobAnalysis: { matchScore: 90 }, updatedAt: new Date("2026-03-01") }),
    makeApp({ id: "3", company: { name: "Mid" }, deadline: null, jobAnalysis: { matchScore: 60 }, updatedAt: new Date("2026-02-01") }),
  ];

  it("sorts by soonest deadline first, nulls last", () => {
    expect(sortApplications(apps, "deadline").map((a) => a.id)).toEqual(["2", "1", "3"]);
  });

  it("sorts by match score descending", () => {
    expect(sortApplications(apps, "match").map((a) => a.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts by company name alphabetically", () => {
    expect(sortApplications(apps, "company").map((a) => a.id)).toEqual(["2", "3", "1"]);
  });

  it("sorts by most recently updated first", () => {
    expect(sortApplications(apps, "updatedAt").map((a) => a.id)).toEqual(["2", "3", "1"]);
  });

  it("does not mutate the input array", () => {
    const copy = [...apps];
    sortApplications(apps, "match");
    expect(apps).toEqual(copy);
  });
});
