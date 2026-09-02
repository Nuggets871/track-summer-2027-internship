import { prisma } from "@/lib/prisma";
import { getReferenceData } from "@/lib/data/reference";
import { ResearchBoard } from "@/components/research/research-board";

export const metadata = { title: "Recherche" };

export default async function ResearchPage() {
  const [items, reference] = await Promise.all([
    prisma.researchItem.findMany({ orderBy: { addedAt: "desc" } }),
    getReferenceData(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Research Database</h1>
        <p className="text-sm text-muted-foreground">Entreprises, programmes, articles, conseils visa, plateformes — centralisez vos recherches.</p>
      </div>
      <ResearchBoard items={items} reference={reference} />
    </div>
  );
}
