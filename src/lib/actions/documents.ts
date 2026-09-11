"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/data/activity";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp"]);
const CATEGORIES = ["CV", "COVER_LETTER", "TRANSCRIPT", "PORTFOLIO", "RECOMMENDATION", "VISA", "OTHER"] as const;

export type DocumentCategory = (typeof CATEGORIES)[number];

export async function uploadApplicationDocument(applicationId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  const rawCategory = String(formData.get("category") ?? "OTHER");
  const category = (CATEGORIES as readonly string[]).includes(rawCategory) ? rawCategory : "OTHER";

  if (!file || file.size === 0) throw new Error("Aucun fichier fourni");
  if (file.size > MAX_BYTES) throw new Error("Fichier trop volumineux (15 Mo maximum).");
  const extension = (file.name.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase();
  if (extension && !ALLOWED_EXTENSIONS.has(extension)) throw new Error("Format non pris en charge.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { mkdir, writeFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { randomUUID } = await import("node:crypto");
  const uploadsDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const storedName = `${randomUUID()}${extension || ".bin"}`;
  await writeFile(path.join(uploadsDir, storedName), buffer);

  const document = await prisma.document.create({
    data: {
      name: file.name.replace(/\.[^.]+$/, "") || "Document",
      category,
      filePath: storedName,
      fileSize: file.size,
      mimeType: file.type || null,
      applicationId,
    },
  });

  await logActivity(applicationId, "DOCUMENT", `Document ajouté : ${document.name}`);
  revalidatePath(`/opportunities/${applicationId}`);
  return document.id;
}

export async function deleteApplicationDocument(id: string) {
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return;
  await prisma.document.delete({ where: { id } });
  if (document.applicationId) {
    await logActivity(document.applicationId, "DOCUMENT", `Document supprimé : ${document.name}`);
    revalidatePath(`/opportunities/${document.applicationId}`);
  }
}
