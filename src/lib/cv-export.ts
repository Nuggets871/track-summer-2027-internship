// Renders a stored, tailored CV to a real .docx and a real .pdf, entirely
// locally. The content is structured JSON (see src/lib/cv-content.ts), so both
// exporters walk the same sections/entries — one source of truth, two formats.
// The candidate's contact block is always taken from the profile, never from
// the generated content, so it can't go stale or be invented by the model.

import { BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/lib/data/profile";
import { countCvWords, fitCvToOnePage, isCvEmpty, parseCvContent, type CvContent } from "@/lib/cv-content";

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
        // A4 (11906 x 16838 twips) so Word paginates like the PDF, with the
        // same 1.8 cm margins. Word's default page is Letter, which is shorter
        // and pushed slightly long CVs onto a second page.
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1020, bottom: 1020, left: 1020, right: 1020 },
          },
        },
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

// The PDF must never exceed one page. Shrinking the layout is preferred because
// it keeps every piece of content; trimming is only a last resort for a CV so
// long that even the smallest scale spills over. 1 = design size.
const PDF_FIT_SCALES = [1, 0.96, 0.92, 0.88, 0.84, 0.8, 0.76];

/**
 * Word budgets tried, in descending order, when shrinking is not enough. They
 * start just under the CV's real length and step down, so the export only ever
 * removes as much as it must to fit one page.
 */
function trimBudgets(words: number): number[] {
  const budgets: number[] = [];
  for (let budget = Math.floor(words * 0.94); budget >= 160; budget = Math.floor(budget * 0.85)) {
    budgets.push(budget);
  }
  return budgets;
}

/** Renders at the largest scale that fits on one page, or null if none does. */
async function renderOnePage(ctx: CvExportContext): Promise<Uint8Array | null> {
  for (const scale of PDF_FIT_SCALES) {
    const rendered = await renderCvPdf(ctx, scale);
    if (rendered.pages <= 1) return rendered.bytes;
  }
  return null;
}

export async function buildCvPdf(ctx: CvExportContext): Promise<Uint8Array> {
  // First try to keep every piece of content by shrinking the layout only.
  const shrunk = await renderOnePage(ctx);
  if (shrunk) return shrunk;
  // Too long even at the smallest scale: drop the least relevant tail until it
  // fits. Only the exported PDF is trimmed — the stored CV keeps its content.
  let last: Uint8Array | null = null;
  for (const budget of trimBudgets(countCvWords(ctx.content))) {
    const fitted = { ...ctx, content: fitCvToOnePage(ctx.content, budget) };
    const bytes = await renderOnePage(fitted);
    if (bytes) return bytes;
    last = (await renderCvPdf(fitted, PDF_FIT_SCALES[PDF_FIT_SCALES.length - 1])).bytes;
  }
  return last ?? (await renderCvPdf(ctx, PDF_FIT_SCALES[PDF_FIT_SCALES.length - 1])).bytes;
}

async function renderCvPdf(ctx: CvExportContext, scale: number): Promise<{ bytes: Uint8Array; pages: number }> {
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
    const fontSize = size * scale;
    const lines = wrapText(text, font, fontSize, width);
    for (const line of lines) {
      ensure(fontSize + 4 * scale);
      page.drawText(line, { x, y: y - fontSize, size: fontSize, font, color: opts.color ?? ink });
      y -= fontSize + 4 * scale;
    }
    y -= (opts.after ?? 0) * scale;
  };

  const ruleLine = (gap = 8) => {
    ensure(gap * scale);
    page.drawLine({ start: { x: margin, y: y - 2 }, end: { x: pageWidth - margin, y: y - 2 }, thickness: 0.75, color: rule });
    y -= gap * scale;
  };

  // Header
  const nameSize = 22 * scale;
  ensure(30 * scale);
  page.drawText(sanitizeForPdf(ctx.candidateName), { x: margin, y: y - nameSize, size: nameSize, font: bold, color: ink });
  y -= 30 * scale;
  if (ctx.headline) write(ctx.headline, regular, 12, { color: muted, after: 4 });
  const contact = [...ctx.contactLines, ...ctx.linkLines];
  if (contact.length > 0) write(contact.join("   ·   "), regular, 9, { color: muted, after: 10 });
  ruleLine(14);

  if (ctx.content.summary) write(ctx.content.summary, regular, 10.5, { after: 12 });

  for (const section of ctx.content.sections) {
    ensure(26 * scale);
    write(section.title.toUpperCase(), bold, 11, { color: rgb(0.12, 0.16, 0.2), after: 2 });
    ruleLine(8);
    for (const entry of section.entries) {
      if (entry.heading) {
        const headingSize = 10.5 * scale;
        const metaSize = 9.5 * scale;
        const metaWidth = entry.meta ? italic.widthOfTextAtSize(sanitizeForPdf(entry.meta), metaSize) : 0;
        const headingWidth = Math.max(60, maxWidth - metaWidth - 12);
        const headingLines = wrapText(entry.heading, bold, headingSize, headingWidth);
        ensure(14 * scale);
        page.drawText(headingLines[0], { x: margin, y: y - headingSize, size: headingSize, font: bold, color: ink });
        if (entry.meta) {
          page.drawText(sanitizeForPdf(entry.meta), { x: pageWidth - margin - metaWidth, y: y - metaSize, size: metaSize, font: italic, color: muted });
        }
        y -= 15 * scale;
        for (const extra of headingLines.slice(1)) {
          ensure(14 * scale);
          page.drawText(extra, { x: margin, y: y - headingSize, size: headingSize, font: bold, color: ink });
          y -= 15 * scale;
        }
      } else if (entry.meta) {
        write(entry.meta, italic, 9.5, { color: muted, after: 4 });
      }
      for (const bullet of entry.bullets) {
        const bulletSize = 10 * scale;
        const bulletLines = wrapText(bullet, regular, bulletSize, maxWidth - 14);
        bulletLines.forEach((line, index) => {
          ensure(13 * scale);
          if (index === 0) page.drawText("\u2022", { x: margin + 2, y: y - bulletSize, size: bulletSize, font: regular, color: muted });
          page.drawText(line, { x: margin + 14, y: y - bulletSize, size: bulletSize, font: regular, color: ink });
          y -= 13 * scale;
        });
        y -= 1 * scale;
      }
      if (entry.tags.length > 0) write(entry.tags.join("   ·   "), italic, 9, { color: muted, after: 5 });
      y -= 4 * scale;
    }
    y -= 6 * scale;
  }

  return { bytes: await pdf.save(), pages: pdf.getPageCount() };
}
