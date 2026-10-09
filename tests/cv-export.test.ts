// Smoke tests for the CV exporters: they must produce real, non-trivial files
// from a structured context without touching prisma or the network.
import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildCvDocx, buildCvPdf, cvFileName, type CvExportContext } from "@/lib/cv-export";
import { normalizeCvContent } from "@/lib/cv-content";

const ctx: CvExportContext = {
  candidateName: "Alex Martin",
  companyName: "Meridian Bank",
  headline: "Élève en Finance",
  contactLines: ["Paris", "alex.martin@example.com"],
  linkLines: ["linkedin.com/in/alex"],
  language: "FR",
  content: {
    headline: "Élève en Finance",
    summary: "Résumé du candidat.",
    sections: [
      {
        id: "s0",
        title: "Expérience professionnelle",
        entries: [
          { id: "s0e0", heading: "Stagiaire - Acme", meta: "2025 · Paris", bullets: ["Analysé des sociétés cibles.", "Construit un modèle DCF."], tags: ["Excel", "Python"] },
        ],
      },
    ],
  },
};

describe("cv export", () => {
  it("names the file from the candidate and the company", () => {
    expect(cvFileName(ctx, "pdf")).toBe("CV_Alex_Martin_Meridian_Bank.pdf");
    expect(cvFileName(ctx, "docx")).toBe("CV_Alex_Martin_Meridian_Bank.docx");
  });

  it("builds a non-empty PDF", async () => {
    const bytes = await buildCvPdf(ctx);
    expect(bytes.length).toBeGreaterThan(1_000);
  });

  it("builds a non-empty DOCX", async () => {
    const buffer = await buildCvDocx(ctx);
    expect(buffer.length).toBeGreaterThan(1_000);
  });

  it("always renders a generated CV on a single page", async () => {
    const content = normalizeCvContent({
      headline: "Élève-ingénieur en informatique",
      summary: "Étudiant passionné par le développement logiciel. À la recherche d'un stage de fin d'études. Motivé par les projets data et web.",
      sections: [
        {
          title: "Expérience professionnelle",
          entries: Array.from({ length: 4 }, (_, i) => ({
            heading: `Stagiaire développeur ${i} - Acme`,
            meta: "Juin 2025 · Paris",
            bullets: Array.from({ length: 5 }, () => "Développé une fonctionnalité complète avec l'équipe produit et livré dans les délais impartis."),
            tags: ["TypeScript", "React"],
          })),
        },
        {
          title: "Projets",
          entries: Array.from({ length: 5 }, (_, i) => ({
            heading: `Projet ${i} - perso`,
            meta: "2025",
            bullets: ["Conçu une application web complète du design au déploiement en production.", "Automatisé les tests et la livraison continue sur l'environnement cloud."],
          })),
        },
        { title: "Compétences", entries: [{ heading: "", bullets: [], tags: ["TypeScript", "React", "Node", "PostgreSQL", "Docker", "AWS"] }] },
      ],
    });
    const bytes = await buildCvPdf({ ...ctx, content });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });
});
