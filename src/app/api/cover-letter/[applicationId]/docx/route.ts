import { NextResponse } from "next/server";
import { buildCoverLetterDocx, coverLetterFileName, loadCoverLetterExportContext } from "@/lib/cover-letter-export";

export async function GET(_req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const context = await loadCoverLetterExportContext(applicationId);
  if (!context) return NextResponse.json({ error: "Aucune lettre enregistrée pour cette opportunité" }, { status: 404 });

  const buffer = await buildCoverLetterDocx(context);
  const name = coverLetterFileName(context, "docx");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="cover-letter.docx"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
