import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse ships pdf.worker.mjs as a sibling file and resolves it with a
  // relative dynamic import at runtime. Bundling it into a single SSR chunk
  // (the default) breaks that resolution — the worker file never gets
  // emitted next to the chunk, so pdfjs-dist's "fake worker" fallback fails
  // with "Cannot find module '.../pdf.worker.mjs'". Opting the package (and
  // its pdfjs-dist dependency) out of bundling makes Next use a native
  // Node `require`/`import` against the real node_modules files instead,
  // where the relative path resolves correctly.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
