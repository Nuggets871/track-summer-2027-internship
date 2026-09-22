// Smoke tests for the CV exporters: they must produce real, non-trivial files
// from a structured context without touching prisma or the network.
import { describe, expect, it } from "vitest";
import { buildCvDocx, buildCvPdf, cvFileName, type CvExportContext } from "@/lib/cv-export";

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
});
