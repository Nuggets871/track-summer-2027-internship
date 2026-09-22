import { NextResponse } from "next/server";
import { buildCvPdf, cvFileName, loadCvExportContext } from "@/lib/cv-export";

export async function GET(_req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const context = await loadCvExportContext(applicationId);
  if (!context) return NextResponse.json({ error: "Aucun CV enregistré pour cette opportunité" }, { status: 404 });

  const bytes = await buildCvPdf(context);
  const name = cvFileName(context, "pdf");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cv.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
