// Renders a stored cover letter to a real .docx and a real .pdf, entirely
// locally. The letter body is stored as plain text (see CoverLetter.content);
// this module only adds the structured letterhead (candidate contact, date,
// recipient) around it so both formats share one source of truth.

import { Document, Packer, Paragraph, TextRun } from "docx";
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
};

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
  };
}

/** Splits the stored text into paragraph blocks, preserving blank lines. */
function contentBlocks(content: string): string[] {
  return content.replace(/\r\n/g, "\n").split("\n");
}

export async function buildCoverLetterDocx(ctx: CoverLetterExportContext): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(new Paragraph({ children: [new TextRun({ text: ctx.candidateName, bold: true, size: 26 })], spacing: { after: 60 } }));
  for (const line of ctx.contactLines) {
    children.push(new Paragraph({ children: [new TextRun({ text: line, size: 18, color: "555555" })], spacing: { after: 20 } }));
  }

  children.push(new Paragraph({ text: "", spacing: { after: 260 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: ctx.date, size: 20 })], spacing: { after: 140 } }));
  for (const line of ctx.recipientLines) {
    children.push(new Paragraph({ children: [new TextRun({ text: line, size: 20 })], spacing: { after: 20 } }));
  }
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

  const drawLine = (text: string, font: PDFFont, size: number) => {
    if (y < margin + leading) newPage();
    page.drawText(text, { x: margin, y, size, font, color: rgb(0.12, 0.12, 0.14) });
    y -= size + 4;
  };

  const writeParagraph = (text: string, font: PDFFont, size: number, after: number) => {
    for (const line of wrapText(text, font, size, maxWidth)) {
      if (y < margin + leading) newPage();
      page.drawText(line, { x: margin, y, size, font, color: rgb(0.12, 0.12, 0.14) });
      y -= leading;
    }
    y -= after;
  };

  drawLine(ctx.candidateName, bold, 15);
  for (const line of ctx.contactLines) drawLine(sanitizeForPdf(line), regular, 9.5);
  y -= 14;
  drawLine(ctx.date, regular, 11);
  for (const line of ctx.recipientLines) drawLine(sanitizeForPdf(line), regular, 11);
  if (ctx.subject) {
    y -= 8;
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
