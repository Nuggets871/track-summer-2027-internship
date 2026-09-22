import { NextResponse } from "next/server";
import { buildCvDocx, cvFileName, loadCvExportContext } from "@/lib/cv-export";

export async function GET(_req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const context = await loadCvExportContext(applicationId);
  if (!context) return NextResponse.json({ error: "Aucun CV enregistré pour cette opportunité" }, { status: 404 });

  const buffer = await buildCvDocx(context);
  const name = cvFileName(context, "docx");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="cv.docx"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
