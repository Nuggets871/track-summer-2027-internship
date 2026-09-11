// Extracts plain text from an uploaded CV file (PDF, DOCX, or plain text)
// so it can be fed to the CV-parsing prompt and kept as Profile.cvRawText
// for every other AI feature (cover letters, CV optimization, interview
// prep) to ground itself on.

export async function extractTextFromCvFile(buffer: Buffer, filename: string, mimeType: string | null): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  if (mimeType === "application/pdf" || ext === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy?.();
    }
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Plain text / markdown / anything else: best-effort decode as UTF-8.
  return buffer.toString("utf-8");
}
