import { describe, expect, it } from "vitest";
import { inspectCoverLetterStyle } from "./cover-letter-style";

describe("inspectCoverLetterStyle", () => {
  it("flags common artificial patterns without claiming to detect AI", () => {
    const warnings = inspectCoverLetterStyle("C'est avec un grand intérêt — ce n'est pas un poste, c'est une vocation.", "Acme");
    expect(warnings.map((warning) => warning.id)).toEqual(expect.arrayContaining(["em-dash", "negative-parallelism", "cliches", "company"]));
  });

  it("accepts a short specific paragraph", () => {
    expect(inspectCoverLetterStyle("Chez Acme, le travail sur votre moteur de recherche rejoint mon expérience de migration d'API.", "Acme")).toEqual([]);
  });
});
