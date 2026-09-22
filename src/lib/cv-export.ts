// Renders a stored, tailored CV to a real .docx and a real .pdf, entirely
// locally. The content is structured JSON (see src/lib/cv-content.ts), so both
// exporters walk the same sections/entries — one source of truth, two formats.
// The candidate's contact block is always taken from the profile, never from
// the generated content, so it can't go stale or be invented by the model.

import { BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/lib/data/profile";
import { isCvEmpty, parseCvContent, type CvContent } from "@/lib/cv-content";

export type CvExportContext = {
  candidateName: string;
  companyName: string;
  headline: string | null;
  contactLines: string[];
  linkLines: string[];
  content: CvContent;
  language: "FR" | "EN";
};

function slug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function cvFileName(ctx: Pick<CvExportContext, "candidateName" | "companyName">, extension: string): string {
  const parts = ["CV", slug(ctx.candidateName), slug(ctx.companyName)].filter(Boolean);
  return `${parts.join("_")}.${extension}`;
}

export async function loadCvExportContext(applicationId: string): Promise<CvExportContext | null> {
  const [application, profile] = await Promise.all([
    prisma.application.findUnique({
      where: { id: applicationId },
      include: { company: true, generatedCv: true },
    }),
    getProfile(),
  ]);
  const content = parseCvContent(application?.generatedCv?.content);
  if (!application || !content || isCvEmpty(content)) return null;

  const candidateName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Candidat";
  const contactLines = [profile.location, profile.email, profile.phone].filter(
    (value): value is string => Boolean(value && value.trim()),
  );
  const linkLines = [profile.linkedinUrl, profile.githubUrl, profile.portfolioUrl].filter(
    (value): value is string => Boolean(value && value.trim()),
  );

  return {
    candidateName,
    companyName: application.company.name,
    headline: content.headline,
    contactLines,
    linkLines,
    content,
    language: application.generatedCv?.language === "EN" ? "EN" : "FR",
  };
}

// --- Word -------------------------------------------------------------------

export async function buildCvDocx(ctx: CvExportContext): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(new Paragraph({ children: [new TextRun({ text: ctx.candidateName, bold: true, size: 40 })], spacing: { after: 40 } }));
  if (ctx.headline) {
    children.push(new Paragraph({ children: [new TextRun({ text: ctx.headline, size: 24, color: "444444" })], spacing: { after: 60 } }));
  }
  if (ctx.contactLines.length > 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: ctx.contactLines.join("  ·  "), size: 18, color: "555555" })], spacing: { after: 20 } }));
  }
  if (ctx.linkLines.length > 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: ctx.linkLines.join("  ·  "), size: 18, color: "555555" })], spacing: { after: 120 } }));
  }
  children.push(
    new Paragraph({
      children: [],
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC", space: 1 } },
      spacing: { after: 200 },
    }),
  );

  if (ctx.content.summary) {
    children.push(new Paragraph({ children: [new TextRun({ text: ctx.content.summary, size: 20 })], spacing: { after: 220 } }));
  }

  for (const section of ctx.content.sections) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.title.toUpperCase(), bold: true, size: 22, color: "1F2937" })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "DDDDDD", space: 2 } },
        spacing: { before: 120, after: 100 },
      }),
    );

    for (const entry of section.entries) {
      if (entry.heading) {
        children.push(new Paragraph({ children: [new TextRun({ text: entry.heading, bold: true, size: 21 })], spacing: { after: 20 } }));
      }
      if (entry.meta) {
        children.push(new Paragraph({ children: [new TextRun({ text: entry.meta, italics: true, size: 18, color: "666666" })], spacing: { after: 40 } }));
      }
      for (const bullet of entry.bullets) {
        children.push(new Paragraph({ children: [new TextRun({ text: bullet, size: 20 })], bullet: { level: 0 }, spacing: { after: 30 } }));
      }
      if (entry.tags.length > 0) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: entry.tags.join("  ·  "), italics: true, size: 18, color: "555555" })], spacing: { after: 60 } }),
        );
      }
    }
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 20 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1020, bottom: 1020, left: 1020, right: 1020 } } },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}

// --- PDF --------------------------------------------------------------------

function sanitizeForPdf(text: string): string {
  return text
    .replace(/\u2192/g, "->")
    .replace(/\u00a0/g, " ")
    .replace(/\u2011/g, "-");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitizeForPdf(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export async function buildCvPdf(ctx: CvExportContext): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 54;
  const maxWidth = pageWidth - margin * 2;
  const ink = rgb(0.11, 0.12, 0.14);
  const muted = rgb(0.4, 0.42, 0.46);
  const rule = rgb(0.82, 0.83, 0.85);

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };
  const ensure = (needed: number) => {
    if (y - needed < margin) newPage();
  };

  // Writes a paragraph at the given x, returning after leaving `after` units of space.
  const write = (text: string, font: PDFFont, size: number, opts: { x?: number; width?: number; color?: ReturnType<typeof rgb>; after?: number } = {}) => {
    const x = opts.x ?? margin;
    const width = opts.width ?? maxWidth - (x - margin);
    const lines = wrapText(text, font, size, width);
    for (const line of lines) {
      ensure(size + 4);
      page.drawText(line, { x, y: y - size, size, font, color: opts.color ?? ink });
      y -= size + 4;
    }
    y -= opts.after ?? 0;
  };

  const ruleLine = (gap = 8) => {
    ensure(gap);
    page.drawLine({ start: { x: margin, y: y - 2 }, end: { x: pageWidth - margin, y: y - 2 }, thickness: 0.75, color: rule });
    y -= gap;
  };

  // Header
  ensure(30);
  page.drawText(sanitizeForPdf(ctx.candidateName), { x: margin, y: y - 22, size: 22, font: bold, color: ink });
  y -= 30;
  if (ctx.headline) write(ctx.headline, regular, 12, { color: muted, after: 4 });
  const contact = [...ctx.contactLines, ...ctx.linkLines];
  if (contact.length > 0) write(contact.join("   ·   "), regular, 9, { color: muted, after: 10 });
  ruleLine(14);

  if (ctx.content.summary) write(ctx.content.summary, regular, 10.5, { after: 12 });

  for (const section of ctx.content.sections) {
    ensure(26);
    write(section.title.toUpperCase(), bold, 11, { color: rgb(0.12, 0.16, 0.2), after: 2 });
    ruleLine(8);
    for (const entry of section.entries) {
      if (entry.heading) {
        const metaWidth = entry.meta ? italic.widthOfTextAtSize(sanitizeForPdf(entry.meta), 9.5) : 0;
        const headingWidth = Math.max(60, maxWidth - metaWidth - 12);
        const headingLines = wrapText(entry.heading, bold, 10.5, headingWidth);
        ensure(14);
        page.drawText(headingLines[0], { x: margin, y: y - 10.5, size: 10.5, font: bold, color: ink });
        if (entry.meta) {
          page.drawText(sanitizeForPdf(entry.meta), { x: pageWidth - margin - metaWidth, y: y - 10.5, size: 9.5, font: italic, color: muted });
        }
        y -= 15;
        for (const extra of headingLines.slice(1)) {
          ensure(14);
          page.drawText(extra, { x: margin, y: y - 10.5, size: 10.5, font: bold, color: ink });
          y -= 15;
        }
      } else if (entry.meta) {
        write(entry.meta, italic, 9.5, { color: muted, after: 4 });
      }
      for (const bullet of entry.bullets) {
        const bulletLines = wrapText(bullet, regular, 10, maxWidth - 14);
        bulletLines.forEach((line, index) => {
          ensure(13);
          if (index === 0) page.drawText("\u2022", { x: margin + 2, y: y - 10, size: 10, font: regular, color: muted });
          page.drawText(line, { x: margin + 14, y: y - 10, size: 10, font: regular, color: ink });
          y -= 13;
        });
        y -= 1;
      }
      if (entry.tags.length > 0) write(entry.tags.join("   ·   "), italic, 9, { color: muted, after: 5 });
      y -= 4;
    }
    y -= 6;
  }

  return pdf.save();
}
