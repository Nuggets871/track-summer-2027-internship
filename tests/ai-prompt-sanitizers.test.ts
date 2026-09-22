// Unit tests for the pure sanitizers and the lenient JSON parser behind the
// AI prompts. Mocking the provider keeps prisma/the network out of the run.
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/provider", () => ({ aiChat: vi.fn() }));

import { parseJsonLoose } from "@/lib/ai/json";
import { sanitizeJobExtraction } from "@/lib/ai/prompts/job-extraction";
import { sanitizeParsedCv } from "@/lib/ai/prompts/cv-parsing";
import { sanitizeCvOptimization } from "@/lib/ai/prompts/cv-optimization";
import { sanitizeGeneratedCv } from "@/lib/ai/prompts/cv-generation";

describe("parseJsonLoose", () => {
  it("parses a fenced JSON block", () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("extracts JSON surrounded by prose", () => {
    expect(parseJsonLoose('Voici le résultat : {"a":[1,2],"b":{"c":true}} — voilà.')).toEqual({ a: [1, 2], b: { c: true } });
  });

  it("returns null for unparseable output", () => {
    expect(parseJsonLoose("pas de json ici")).toBeNull();
    expect(parseJsonLoose(null)).toBeNull();
  });
});

describe("sanitizeJobExtraction — grounding", () => {
  it("keeps only languages proven by an exact quote and present in the source", () => {
    const source = "Fluent English required for this role.";
    const result = sanitizeJobExtraction(
      {
        requiredLanguages: ["English", "German"],
        evidence: { requiredLanguages: { English: "Fluent English required", German: "German" } },
      },
      source,
    );
    expect(result.requiredLanguages).toEqual(["English"]);
  });

  it("keeps a salary only when grounded by an exact quote", () => {
    const source = "Salary: 2500 EUR per month.";
    const grounded = sanitizeJobExtraction(
      { salaryAmount: 2500, salaryCurrency: "EUR", evidence: { salary: "2500 EUR per month" } },
      source,
    );
    expect(grounded.salaryAmount).toBe(2500);

    const ungrounded = sanitizeJobExtraction({ salaryAmount: 9999, salaryCurrency: "USD" }, source);
    expect(ungrounded.salaryAmount).toBeNull();
  });

  it("rejects a deadline with no evidence quote", () => {
    const result = sanitizeJobExtraction({ deadline: "2026-10-15" }, "no date here");
    expect(result.deadline).toBeNull();
  });
});

describe("sanitizeParsedCv", () => {
  it("coerces unknown language levels and drops empty languages", () => {
    const result = sanitizeParsedCv({
      languages: [
        { language: "English", level: "weird" },
        { language: "", level: "NATIVE" },
      ],
    });
    expect(result.languages).toHaveLength(1);
    expect(result.languages[0]).toEqual({ language: "English", level: "INTERMEDIATE" });
  });

  it("canonicalizes skill aliases", () => {
    expect(sanitizeParsedCv({ skills: ["nodejs"] }).skills).toEqual(["Node.js"]);
  });
});

describe("sanitizeCvOptimization", () => {
  it("drops empty rewrites and trims the rest", () => {
    const result = sanitizeCvOptimization({
      bulletRewrites: [
        { original: "  built a thing ", improved: " Built a thing " },
        { original: "", improved: "x" },
      ],
      highlights: ["keep", ""],
    });
    expect(result.bulletRewrites).toEqual([{ original: "built a thing", improved: "Built a thing" }]);
    expect(result.highlights).toEqual(["keep"]);
  });
});

describe("sanitizeGeneratedCv", () => {
  it("coerces a valid section/entry payload and drops empty sections", () => {
    const result = sanitizeGeneratedCv({
      headline: "  Élève ingénieur  ",
      summary: "",
      sections: [
        { title: "Expérience", entries: [{ heading: "Stage - Acme", meta: " 2025 ", bullets: [" Fait X ", ""], tags: ["Python"] }] },
        { title: "", entries: [] },
      ],
    });
    expect(result.headline).toBe("Élève ingénieur");
    expect(result.summary).toBeNull();
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe("Expérience");
    expect(result.sections[0].entries[0]).toEqual({
      id: "s0e0",
      heading: "Stage - Acme",
      meta: "2025",
      bullets: ["Fait X"],
      tags: ["Python"],
    });
  });

  it("returns an empty CV for a malformed payload", () => {
    expect(sanitizeGeneratedCv({ sections: "nope" })).toEqual({ headline: null, summary: null, sections: [] });
    expect(sanitizeGeneratedCv({})).toEqual({ headline: null, summary: null, sections: [] });
  });
});
