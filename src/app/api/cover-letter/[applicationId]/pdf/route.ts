import { NextResponse } from "next/server";
import { buildCoverLetterPdf, coverLetterFileName, loadCoverLetterExportContext } from "@/lib/cover-letter-export";

export async function GET(_req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const context = await loadCoverLetterExportContext(applicationId);
  if (!context) return NextResponse.json({ error: "Aucune lettre enregistrée pour cette opportunité" }, { status: 404 });

  const bytes = await buildCoverLetterPdf(context);
  const name = coverLetterFileName(context, "pdf");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cover-letter.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
