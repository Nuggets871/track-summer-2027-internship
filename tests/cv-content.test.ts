// Pure tests for the CV content model and the no-AI profile fallback. No
// prisma/network involved — the fallback only reads an AppProfile-shaped object.
import { describe, expect, it } from "vitest";
import { countCvWords, CV_ONE_PAGE_WORDS, fitCvToOnePage, isCvEmpty, normalizeCvContent, parseCvContent } from "@/lib/cv-content";
import { buildCvFromProfile } from "@/lib/cv-from-profile";
import type { AppProfile } from "@/lib/data/profile";

describe("normalizeCvContent", () => {
  it("assigns stable ids and trims fields", () => {
    const content = normalizeCvContent({
      headline: " Dev ",
      summary: " Bonjour ",
      sections: [
        { title: " Expérience ", entries: [{ heading: " Stage - Acme ", bullets: [" A ", ""], tags: [" Python "] }] },
      ],
    });
    expect(content.headline).toBe("Dev");
    expect(content.sections[0].id).toBe("s0");
    expect(content.sections[0].entries[0]).toMatchObject({ id: "s0e0", heading: "Stage - Acme", bullets: ["A"], tags: ["Python"] });
  });

  it("drops sections and entries with no content", () => {
    const content = normalizeCvContent({ sections: [{ title: "", entries: [] }, { title: "Formation", entries: [{ heading: "" }] }] });
    expect(content.sections).toHaveLength(1);
    expect(content.sections[0].entries).toHaveLength(0);
  });
});

describe("parseCvContent", () => {
  it("round-trips stored JSON and tolerates missing ids", () => {
    const stored = JSON.stringify({ headline: "Dev", sections: [{ title: "Formation", entries: [{ heading: "Master", bullets: [] }] }] });
    const parsed = parseCvContent(stored);
    expect(parsed?.sections[0].entries[0].id).toBe("s0e0");
    expect(isCvEmpty(parsed)).toBe(false);
  });

  it("returns null for absent or broken JSON", () => {
    expect(parseCvContent(null)).toBeNull();
    expect(parseCvContent("{not json")).toBeNull();
  });
});

describe("fitCvToOnePage", () => {
  const bigCv = normalizeCvContent({
    headline: "Élève-ingénieur",
    summary: "Phrase une. Phrase deux. Phrase trois. Phrase quatre. Phrase cinq.",
    sections: [
      {
        title: "Expérience professionnelle",
        entries: Array.from({ length: 4 }, (_, i) => ({
          heading: `Stage ${i} - Entreprise`,
          meta: "2025 · Paris",
          bullets: Array.from({ length: 5 }, () => "Développé une fonctionnalité complète en collaboration avec l'équipe produit et livré dans les délais."),
          tags: ["TypeScript", "React", "Node", "PostgreSQL"],
        })),
      },
      { title: "Compétences", entries: [{ heading: "", bullets: [], tags: ["Python", "SQL", "Docker", "Git", "AWS", "CI/CD"] }] },
    ],
  });

  it("trims an oversized CV down to the one-page word budget", () => {
    const fitted = fitCvToOnePage(bigCv);
    expect(countCvWords(fitted)).toBeLessThanOrEqual(CV_ONE_PAGE_WORDS);
    expect(countCvWords(fitted)).toBeLessThan(countCvWords(bigCv));
  });

  it("caps the summary length and never mutates the input", () => {
    const before = JSON.stringify(bigCv);
    const fitted = fitCvToOnePage(bigCv);
    expect(JSON.stringify(bigCv)).toBe(before);
    expect(fitted.summary?.split(". ").length).toBeLessThanOrEqual(3);
  });

  it("leaves a CV that already fits untouched", () => {
    const small = normalizeCvContent({ headline: "Dev", summary: "Bonjour.", sections: [{ title: "Formation", entries: [{ heading: "Master", bullets: ["Major de promo."] }] }] });
    expect(fitCvToOnePage(small)).toEqual(small);
  });
});

describe("buildCvFromProfile", () => {
  const profile = {
    firstName: "Alex",
    lastName: "Martin",
    headline: "Élève ingénieur",
    summary: "Résumé",
    experiences: [
      { title: "Stagiaire", company: "Acme", startDate: "2025-06", endDate: "2025-08", description: "Ligne une\nLigne deux" },
    ],
    educationHistory: [],
    projects: [],
    skills: ["Python", "SQL"],
    languages: [{ language: "Anglais", level: "FLUENT" }],
  } as unknown as AppProfile;

  it("maps profile history into rendered sections with a hyphen separator", () => {
    const content = buildCvFromProfile(profile, "FR");
    const titles = content.sections.map((section) => section.title);
    expect(titles).toContain("Expérience professionnelle");
    expect(titles).toContain("Compétences");
    expect(titles).toContain("Langues");
    const experience = content.sections.find((section) => section.title === "Expérience professionnelle")!;
    expect(experience.entries[0].heading).toBe("Stagiaire - Acme");
    expect(experience.entries[0].bullets).toEqual(["Ligne une", "Ligne deux"]);
    expect(countCvWords(content)).toBeGreaterThan(0);
  });

  it("uses English section titles when asked", () => {
    const titles = buildCvFromProfile(profile, "EN").sections.map((section) => section.title);
    expect(titles).toContain("Professional experience");
    expect(titles).toContain("Languages");
  });
});
