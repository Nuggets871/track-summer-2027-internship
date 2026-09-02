import { prisma } from "@/lib/prisma";
import { DocumentsPanel } from "@/components/documents/documents-panel";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const documents = await prisma.document.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Documents</h1>
        <p className="text-sm text-muted-foreground">CV, lettres de motivation, relevés de notes, documents visa — toutes vos versions au même endroit.</p>
      </div>
      <DocumentsPanel documents={documents} />
    </div>
  );
}
