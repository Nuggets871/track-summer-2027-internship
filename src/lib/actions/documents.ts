"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const documentMetaSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  category: z.string().default("OTHER"),
  version: z.preprocess(emptyToNull, z.string().nullable().optional()),
  applicationId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  companyId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

function revalidateDocumentPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/documents");
  revalidatePath("/cover-letters");
}

/**
 * Saves an uploaded file under /uploads (outside of the Next.js build output)
 * and records its metadata. Runs entirely locally — nothing leaves the
 * machine.
 */
export async function uploadDocument(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new Error("Aucun fichier fourni");

  const meta = documentMetaSchema.parse({
    name: (formData.get("name") as string) || file.name,
    category: (formData.get("category") as string) || "OTHER",
    version: formData.get("version") as string | null,
    applicationId: formData.get("applicationId") as string | null,
    companyId: formData.get("companyId") as string | null,
    notes: formData.get("notes") as string | null,
  });

  await mkdir(UPLOADS_DIR, { recursive: true });
  const ext = path.extname(file.name);
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, storedName), buffer);

  const document = await prisma.document.create({
    data: {
      ...meta,
      filePath: storedName,
      fileSize: file.size,
      mimeType: file.type || null,
    },
  });

  revalidateDocumentPaths();
  return document;
}

export async function updateDocumentMeta(id: string, raw: Partial<z.infer<typeof documentMetaSchema>>) {
  const data = documentMetaSchema.partial().parse(raw);
  const document = await prisma.document.update({ where: { id }, data });
  revalidateDocumentPaths();
  return document;
}

export async function deleteDocument(id: string) {
  const document = await prisma.document.findUniqueOrThrow({ where: { id } });
  await prisma.document.delete({ where: { id } });
  try {
    await unlink(path.join(UPLOADS_DIR, document.filePath));
  } catch {
    // File already gone — nothing to clean up.
  }
  revalidateDocumentPaths();
}

export async function setDocumentTags(id: string, tagIds: string[]) {
  await prisma.document.update({ where: { id }, data: { tags: { set: tagIds.map((tagId) => ({ id: tagId })) } } });
  revalidateDocumentPaths();
}
