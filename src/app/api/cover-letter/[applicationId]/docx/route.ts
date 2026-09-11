import { NextResponse } from "next/server";
import { buildCoverLetterDocx, loadCoverLetterExportContext } from "@/lib/cover-letter-export";

function fileName(ctx: { candidateName: string; recipientLines: string[] }, extension: string) {
  const company = ctx.recipientLines[0] ?? "entreprise";
  return `Lettre ${ctx.candidateName} - ${company}.${extension}`.replace(/[\\/:*?"<>|]/g, "").slice(0, 120);
}

export async function GET(_req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const context = await loadCoverLetterExportContext(applicationId);
  if (!context) return NextResponse.json({ error: "Aucune lettre enregistrée pour cette opportunité" }, { status: 404 });

  const buffer = await buildCoverLetterDocx(context);
  const name = fileName(context, "docx");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="cover-letter.docx"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
