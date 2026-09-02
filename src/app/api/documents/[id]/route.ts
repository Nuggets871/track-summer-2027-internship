import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  try {
    const buffer = await readFile(path.join(UPLOADS_DIR, document.filePath));
    const ext = path.extname(document.filePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(document.name)}${ext}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable sur le disque" }, { status: 404 });
  }
}
