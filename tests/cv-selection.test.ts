// Tests for the deterministic CV curation: it must show less, keep the entries
// and skills that relate to the offer, and never alter the original content.
import { describe, expect, it } from "vitest";
import { normalizeCvContent } from "@/lib/cv-content";
import { selectRelevantCvContent } from "@/lib/cv-selection";

const content = normalizeCvContent({
  headline: "Élève-ingénieur",
  summary: "Résumé.",
  sections: [
    {
      title: "Expérience professionnelle",
      entries: [
        { heading: "Stagiaire data - A", bullets: ["Analysé des données avec Python."], tags: [] },
        { heading: "Stagiaire web - B", bullets: ["Développé une interface React."], tags: [] },
        { heading: "Stagiaire infra - C", bullets: ["Déployé des conteneurs Docker."], tags: [] },
        { heading: "Stagiaire vente - D", bullets: ["Vendu des produits."], tags: [] },
        { heading: "Stagiaire support - E", bullets: ["Répondu aux clients."], tags: [] },
      ],
    },
    {
      title: "Projets",
      entries: [
        { heading: "Projet Python - 1", bullets: ["Script d'analyse."], tags: [] },
        { heading: "Projet web - 2", bullets: ["Site vitrine."], tags: [] },
        { heading: "Projet jeu - 3", bullets: ["Petit jeu."], tags: [] },
      ],
    },
    {
      title: "Compétences",
      entries: [
        { heading: "Langages", bullets: [], tags: ["Python", "Java", "C", "PHP"] },
        { heading: "Outils", bullets: [], tags: ["Docker", "Git", "Linux"] },
        { heading: "Divers", bullets: [], tags: ["Photoshop", "Montage"] },
      ],
    },
  ],
});

describe("selectRelevantCvContent", () => {
  const selected = selectRelevantCvContent(content, { requiredSkills: ["Python", "Docker"] });

  it("caps experience to 3 and projects to 2 entries", () => {
    const experience = selected.sections.find((section) => section.title === "Expérience professionnelle")!;
    const projects = selected.sections.find((section) => section.title === "Projets")!;
    expect(experience.entries).toHaveLength(3);
    expect(projects.entries).toHaveLength(2);
  });

  it("keeps the entries most relevant to the offer", () => {
    const headings = selected.sections[0].entries.map((entry) => entry.heading);
    expect(headings).toContain("Stagiaire data - A");
    expect(headings).toContain("Stagiaire infra - C");
  });

  it("keeps only the skills the offer asks for and drops empty categories", () => {
    const skills = selected.sections.find((section) => section.title === "Compétences")!;
    const tags = skills.entries.flatMap((entry) => entry.tags);
    expect(tags).toEqual(["Python", "Docker"]);
    expect(skills.entries.map((entry) => entry.heading)).not.toContain("Divers");
  });

  it("caps bullets at 3 and never mutates the input", () => {
    const before = JSON.stringify(content);
    const manyBullets = normalizeCvContent({
      headline: null,
      summary: null,
      sections: [{ title: "Projets", entries: [{ heading: "P", bullets: ["a", "b", "c", "d", "e"], tags: [] }] }],
    });
    const out = selectRelevantCvContent(manyBullets, { requiredSkills: [] });
    expect(out.sections[0].entries[0].bullets).toEqual(["a", "b", "c"]);
    expect(JSON.stringify(content)).toBe(before);
  });

  it("keeps every skill when the offer has no extracted skills", () => {
    const skills = selectRelevantCvContent(content, { requiredSkills: [] }).sections.find((section) => section.title === "Compétences")!;
    expect(skills.entries.flatMap((entry) => entry.tags)).toHaveLength(9);
  });

  it("matches slash-separated offer skills on each alternative", () => {
    const withLinux = normalizeCvContent({
      headline: null,
      summary: null,
      sections: [{ title: "Compétences", entries: [{ heading: "Outils", bullets: [], tags: ["Linux", "Git"] }] }],
    });
    const tags = selectRelevantCvContent(withLinux, { requiredSkills: ["Linux/Unix"] }).sections[0].entries.flatMap((entry) => entry.tags);
    expect(tags).toEqual(["Linux"]);
  });
});
