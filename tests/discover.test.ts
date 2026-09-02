import { describe, expect, it } from "vitest";
import { looksLikeInternship, guessSector, splitLocation } from "@/lib/discover/classify";
import { canonicalizeUrl, normalizeForDedup } from "@/lib/discover/dedup";
import { mapGenericRecordToRawJob } from "@/lib/discover/providers/generic-mapping";
import { buildMatchQuery } from "@/lib/discover/search-index";

describe("looksLikeInternship", () => {
  it("recognizes common internship titles across languages", () => {
    expect(looksLikeInternship("Summer Analyst Internship", null)).toBe(true);
    expect(looksLikeInternship("Stagiaire Marketing", null)).toBe(true);
    expect(looksLikeInternship("Working Student - Data", null)).toBe(true);
    expect(looksLikeInternship("Software Engineering Co-op", null)).toBe(true);
  });

  it("uses the department when the title alone doesn't say it", () => {
    expect(looksLikeInternship("Analyst", "Internship Program")).toBe(true);
  });

  it("rejects senior/lead roles even if they mention 'graduate'", () => {
    expect(looksLikeInternship("Senior Software Engineer", null)).toBe(false);
    expect(looksLikeInternship("Lead Data Scientist", null)).toBe(false);
  });

  it("rejects regular full-time roles", () => {
    expect(looksLikeInternship("Software Engineer", "Engineering")).toBe(false);
  });

  it("does not false-positive on words that merely contain 'intern' or 'stage'", () => {
    // Real titles found on GitLab's own Greenhouse board — a naive
    // substring match on "intern" would wrongly flag all of these.
    expect(looksLikeInternship("Senior Internal Auditor, Technology", null)).toBe(false);
    expect(looksLikeInternship("International Trade Compliance Analyst", null)).toBe(false);
    expect(looksLikeInternship("Backstage Operations Manager", null)).toBe(false);
    expect(looksLikeInternship("Vintage Wine Buyer", null)).toBe(false);
  });
});

describe("guessSector", () => {
  it("maps finance-related titles to Finance", () => {
    expect(guessSector("Investment Banking Summer Analyst", null)).toBe("Finance");
  });

  it("returns null rather than guessing when nothing matches", () => {
    expect(guessSector("Random Title", null)).toBeNull();
  });
});

describe("splitLocation", () => {
  it("splits 'City, Country'", () => {
    expect(splitLocation("London, United Kingdom")).toEqual({ cityName: "London", countryName: "United Kingdom" });
  });

  it("treats a single value as a country", () => {
    expect(splitLocation("France")).toEqual({ cityName: null, countryName: "France" });
  });

  it("treats 'Remote' as no location rather than a country named Remote", () => {
    expect(splitLocation("Remote")).toEqual({ cityName: null, countryName: null });
  });

  it("returns nulls for empty input", () => {
    expect(splitLocation(null)).toEqual({ cityName: null, countryName: null });
    expect(splitLocation("")).toEqual({ cityName: null, countryName: null });
  });
});

describe("canonicalizeUrl", () => {
  it("ignores query string, fragment, trailing slash and casing", () => {
    const a = canonicalizeUrl("https://Boards.Greenhouse.io/acme/jobs/123?gh_src=abc");
    const b = canonicalizeUrl("https://boards.greenhouse.io/acme/jobs/123/#apply");
    expect(a).toBe(b);
  });

  it("falls back to a lowercased trimmed string for an invalid URL", () => {
    expect(canonicalizeUrl("  Not A URL  ")).toBe("not a url");
  });
});

describe("normalizeForDedup", () => {
  it("strips accents and punctuation, lowercases", () => {
    expect(normalizeForDedup("Société Générale — Stage!")).toBe("societe generale stage");
  });
});

describe("mapGenericRecordToRawJob", () => {
  it("maps common column-name variants case-insensitively", () => {
    const row = { Company: "Acme", Role: "Summer Intern", Location: "Paris, France", URL: "https://acme.example/jobs/1" };
    const job = mapGenericRecordToRawJob(row, 0);
    expect(job).toMatchObject({ companyName: "Acme", title: "Summer Intern", locationText: "Paris, France", sourceUrl: "https://acme.example/jobs/1" });
  });

  it("skips a row missing a title or a url rather than guessing one", () => {
    expect(mapGenericRecordToRawJob({ Company: "Acme" }, 0)).toBeNull();
    expect(mapGenericRecordToRawJob({ Title: "Intern" }, 0)).toBeNull();
  });

  it("defaults the company to a clear placeholder rather than inventing a name", () => {
    const job = mapGenericRecordToRawJob({ title: "Intern", url: "https://x.example/1" }, 0);
    expect(job?.companyName).toBe("Entreprise non renseignée");
  });
});

describe("buildMatchQuery", () => {
  it("requires every term to match (implicit AND) and quotes/prefixes each one", () => {
    expect(buildMatchQuery("finance london summer")).toBe('"finance"* "london"* "summer"*');
  });

  it("returns null for an empty query", () => {
    expect(buildMatchQuery("   ")).toBeNull();
  });

  it("strips quotes from terms so they can't break the MATCH syntax", () => {
    expect(buildMatchQuery('finance" OR 1=1')).toBe('"finance"* "OR"* "1=1"*');
  });
});
