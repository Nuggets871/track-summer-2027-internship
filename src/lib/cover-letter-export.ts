// Renders a stored cover letter to a real .docx and a real .pdf, entirely
// locally. The letter body is stored as plain text (see CoverLetter.content);
// this module only adds the structured letterhead (candidate contact, date,
// recipient) around it so both formats share one source of truth.

import { BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/lib/data/profile";

export type CoverLetterExportContext = {
  candidateName: string;
  contactLines: string[];
  date: string;
  recipientLines: string[];
  subject: string | null;
  content: string;
  language: "FR" | "EN";
};

/** Builds an attachment name with underscored, ASCII-safe segments. */
export function coverLetterFileName(
  ctx: Pick<CoverLetterExportContext, "language" | "candidateName" | "recipientLines">,
  extension: string,
): string {
  const slug = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const label = ctx.language === "FR" ? "Lettre" : "Cover_letter";
  const company = ctx.recipientLines[0] ?? (ctx.language === "FR" ? "Entreprise" : "Company");
  return `${[label, slug(ctx.candidateName), slug(company)].filter(Boolean).join("_")}.${extension}`;
}

function cleanName(profile: { firstName: string | null; lastName: string | null }): string {
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Candidat";
}

export async function loadCoverLetterExportContext(applicationId: string): Promise<CoverLetterExportContext | null> {
  const [application, profile] = await Promise.all([
    prisma.application.findUnique({
      where: { id: applicationId },
      include: { company: true, country: true, coverLetter: true },
    }),
    getProfile(),
  ]);
  if (!application?.coverLetter?.content?.trim()) return null;

  const contactLines = [profile.location, profile.email, profile.phone, profile.portfolioUrl ?? profile.linkedinUrl]
    .filter((value): value is string => Boolean(value && value.trim()));

  const recipientLines = [
    application.company.name,
    application.country ? application.country.name : null,
  ].filter((value): value is string => Boolean(value));

  const language = application.coverLetter.language === "EN" ? "en-US" : "fr-FR";
  const date = new Intl.DateTimeFormat(language, { day: "numeric", month: "long", year: "numeric" })
    .format(application.coverLetter.updatedAt);

  return {
    candidateName: cleanName(profile),
    contactLines,
    date,
    recipientLines,
    subject: `${application.coverLetter.language === "EN" ? "Subject" : "Objet"} : ${application.title} — ${application.company.name}`,
    content: application.coverLetter.content,
    language: application.coverLetter.language === "FR" ? "FR" : "EN",
  };
}

/** Splits the stored text into paragraph blocks, preserving blank lines. */
function contentBlocks(content: string): string[] {
  return content.replace(/\r\n/g, "\n").split("\n");
}

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

export async function buildCoverLetterDocx(ctx: CoverLetterExportContext): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [];

  // Two-column letterhead: candidate on the left, recipient on the right.
  const leftCell = new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    margins: { top: 0, bottom: 0, left: 0, right: 120 },
    children: [
      new Paragraph({ children: [new TextRun({ text: ctx.candidateName, bold: true, size: 26 })], spacing: { after: 60 } }),
      ...ctx.contactLines.map(
        (line) => new Paragraph({ children: [new TextRun({ text: line, size: 18, color: "555555" })], spacing: { after: 20 } }),
      ),
    ],
  });
  const rightCell = new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    margins: { top: 0, bottom: 0, left: 120, right: 0 },
    children: [
      new Paragraph({ children: [new TextRun({ text: ctx.date, size: 20 })], alignment: "right", spacing: { after: 80 } }),
      ...ctx.recipientLines.map(
        (line) => new Paragraph({ children: [new TextRun({ text: line, size: 20 })], alignment: "right", spacing: { after: 20 } }),
      ),
    ],
  });
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [new TableRow({ children: [leftCell, rightCell] })],
    }),
  );

  children.push(new Paragraph({ text: "", spacing: { after: 240 } }));
  if (ctx.subject) {
    children.push(new Paragraph({ children: [new TextRun({ text: ctx.subject, bold: true, size: 20 })], spacing: { before: 200, after: 160 } }));
  }

  for (const block of contentBlocks(ctx.content)) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: block, size: 22 })],
        spacing: { after: block.trim() ? 140 : 120 },
      }),
    );
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}

function sanitizeForPdf(text: string): string {
  return text
    .replace(/\u2192/g, "->")
    .replace(/\u2022/g, "-")
    .replace(/\u00a0/g, " ");
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

export async function buildCoverLetterPdf(ctx: CoverLetterExportContext): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 64;
  const maxWidth = pageWidth - margin * 2;
  const bodySize = 11.5;
  const leading = 16.5;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const newPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const inkColor = rgb(0.12, 0.12, 0.14);

  const writeParagraph = (text: string, font: PDFFont, size: number, after: number) => {
    for (const line of wrapText(text, font, size, maxWidth)) {
      if (y < margin + leading) newPage();
      page.drawText(line, { x: margin, y, size, font, color: rgb(0.12, 0.12, 0.14) });
      y -= leading;
    }
    y -= after;
  };

  // Two-column letterhead: candidate on the left, recipient right-aligned.
  const rightEdge = pageWidth - margin;

  let leftY = pageHeight - margin;
  const drawLeftLine = (text: string, font: PDFFont, size: number, gap = 4) => {
    page.drawText(sanitizeForPdf(text), { x: margin, y: leftY - size, size, font, color: inkColor });
    leftY -= size + gap;
  };

  let rightY = pageHeight - margin;
  const drawRightLine = (text: string, font: PDFFont, size: number, gap = 4) => {
    const clean = sanitizeForPdf(text);
    page.drawText(clean, { x: rightEdge - font.widthOfTextAtSize(clean, size), y: rightY - size, size, font, color: inkColor });
    rightY -= size + gap;
  };

  drawLeftLine(ctx.candidateName, bold, 15, 6);
  for (const line of ctx.contactLines) drawLeftLine(line, regular, 9.5, 3);

  drawRightLine(ctx.date, regular, 11, 8);
  for (const line of ctx.recipientLines) drawRightLine(line, regular, 11, 3);

  y = Math.min(leftY, rightY) - 16;
  if (ctx.subject) {
    writeParagraph(ctx.subject, bold, 11, 8);
  }
  y -= 6;

  for (const block of contentBlocks(ctx.content)) {
    if (!block.trim()) {
      y -= 8;
      continue;
    }
    writeParagraph(block, regular, bodySize, 4);
  }

  return pdf.save();
}
