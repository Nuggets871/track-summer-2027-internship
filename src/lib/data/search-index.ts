import { prisma } from "@/lib/prisma";

export type SearchItem = {
  id: string;
  type: "opportunity";
  label: string;
  sublabel?: string;
  href: string;
};

const LIMIT = 1000;

/** Global search only ever needs to find one thing: an opportunity. */
export async function getSearchIndex(): Promise<SearchItem[]> {
  const applications = await prisma.application.findMany({
    take: LIMIT,
    include: { company: true, status: true },
    orderBy: { updatedAt: "desc" },
  });

  return applications.map((a) => ({
    id: a.id,
    type: "opportunity" as const,
    label: `${a.company.name} — ${a.title}`,
    sublabel: a.status.label,
    href: `/opportunities/${a.id}`,
  }));
}
