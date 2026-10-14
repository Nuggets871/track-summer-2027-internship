import { NextResponse } from "next/server";
import { buildCvPdf, cvFileName, loadCvExportContext } from "@/lib/cv-export";

export async function GET(req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const context = await loadCvExportContext(applicationId);
  if (!context) return NextResponse.json({ error: "Aucun CV enregistré pour cette opportunité" }, { status: 404 });

  const bytes = await buildCvPdf(context);
  const name = cvFileName(context, "pdf");
  // `inline=1` serves the file for the in-app viewer; the default is a download.
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="cv.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}
