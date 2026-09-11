// One-time, idempotent import of the candidate's reference cover letter into
// the local database. Runs at container start (see Dockerfile CMD): the file
// lives in a server folder bind-mounted at /app/local-assets, so it is never
// committed to git nor baked into the image.
//
// Local development does not use this script: `npm run db:seed` imports the
// same file from local-assets/.
//
// Override the path with REFERENCE_LETTER_PATH if needed.

import { existsSync, mkdirSync, copyFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const DEFAULT_PATH = path.join(process.cwd(), "local-assets", "reference-cover-letter.pdf");

async function extractText(filePath, extension) {
  const buffer = readFileSync(filePath);
  if (extension === ".pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy?.();
    }
  }
  if (extension === ".docx") {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer })).value;
  }
  return buffer.toString("utf-8");
}

async function main() {
  const source = process.env.REFERENCE_LETTER_PATH || DEFAULT_PATH;
  if (!existsSync(source)) {
    console.log(`[reference-letter] no file at ${source} — skipping`);
    return;
  }

  const prisma = new PrismaClient();
  try {
    const profile = await prisma.profile.upsert({
      where: { id: "singleton" },
      create: { id: "singleton" },
      update: {},
    });
    if (profile.coverLetterReference) {
      console.log("[reference-letter] already configured — skipping");
      return;
    }

    const extension = path.extname(source).toLowerCase();
    const text = await extractText(source, extension);
    if (!text?.trim()) {
      console.warn("[reference-letter] no text extracted — skipping");
      return;
    }

    const uploadsDir = path.join(process.cwd(), "uploads");
    mkdirSync(uploadsDir, { recursive: true });
    const storedName = `reference-cover-letter${extension || ".txt"}`;
    copyFileSync(source, path.join(uploadsDir, storedName));

    const document = await prisma.document.create({
      data: {
        name: "Lettre de motivation de référence",
        category: "COVER_LETTER",
        version: "v1",
        filePath: storedName,
        fileSize: readFileSync(source).length,
        mimeType: extension === ".pdf" ? "application/pdf" : null,
      },
    });
    await prisma.profile.update({
      where: { id: "singleton" },
      data: { coverLetterReference: text, coverLetterReferenceDocumentId: document.id },
    });
    console.log("[reference-letter] imported successfully");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // An optional personal asset must never block container startup.
  console.warn("[reference-letter] skipped:", error instanceof Error ? error.message : error);
});
