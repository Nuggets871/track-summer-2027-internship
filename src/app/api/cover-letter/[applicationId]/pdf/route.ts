import { NextResponse } from "next/server";
import { buildCoverLetterPdf, loadCoverLetterExportContext } from "@/lib/cover-letter-export";

function fileName(ctx: { candidateName: string; recipientLines: string[] }, extension: string) {
  const company = ctx.recipientLines[0] ?? "entreprise";
  return `Lettre ${ctx.candidateName} - ${company}.${extension}`.replace(/[\\/:*?"<>|]/g, "").slice(0, 120);
}

export async function GET(_req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const context = await loadCoverLetterExportContext(applicationId);
  if (!context) return NextResponse.json({ error: "Aucune lettre enregistrée pour cette opportunité" }, { status: 404 });

  const bytes = await buildCoverLetterPdf(context);
  const name = fileName(context, "pdf");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cover-letter.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
