import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });

  // Confine the stored path to /uploads. A backup import (or a future bug)
  // could otherwise persist a "../../etc/passwd"-style value and turn this
  // route into an arbitrary local file read.
  const resolved = path.resolve(UPLOADS_DIR, document.filePath);
  if (resolved !== UPLOADS_DIR && !resolved.startsWith(UPLOADS_DIR + path.sep)) {
    return NextResponse.json({ error: "Chemin de fichier invalide" }, { status: 400 });
  }

  try {
    const buffer = await readFile(resolved);
    const ext = path.extname(document.filePath).replace(/[^a-zA-Z0-9.]/g, "");
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
