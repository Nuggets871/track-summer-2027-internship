import { prisma } from "@/lib/prisma";

export type SearchItem = {
  id: string;
  type: "application" | "company" | "contact" | "task" | "note" | "document" | "research" | "interview";
  label: string;
  sublabel?: string;
  href: string;
};

const LIMIT = 500;

export async function getSearchIndex(): Promise<SearchItem[]> {
  const [applications, companies, contacts, tasks, notes, documents, research, interviews] = await Promise.all([
    prisma.application.findMany({
      take: LIMIT,
      include: { company: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.company.findMany({ take: LIMIT, orderBy: { updatedAt: "desc" } }),
    prisma.contact.findMany({ take: LIMIT, orderBy: { updatedAt: "desc" } }),
    prisma.task.findMany({ take: LIMIT, orderBy: { updatedAt: "desc" } }),
    prisma.note.findMany({ take: LIMIT, orderBy: { updatedAt: "desc" } }),
    prisma.document.findMany({ take: LIMIT, orderBy: { updatedAt: "desc" } }),
    prisma.researchItem.findMany({ take: LIMIT, orderBy: { updatedAt: "desc" } }),
    prisma.interview.findMany({ take: LIMIT, include: { application: { include: { company: true } } } }),
  ]);

  const items: SearchItem[] = [];

  for (const a of applications) {
    items.push({ id: a.id, type: "application", label: `${a.company.name} — ${a.title}`, sublabel: "Candidature", href: `/applications/${a.id}` });
  }
  for (const c of companies) {
    items.push({ id: c.id, type: "company", label: c.name, sublabel: c.sector ?? "Entreprise", href: `/companies/${c.id}` });
  }
  for (const c of contacts) {
    items.push({ id: c.id, type: "contact", label: `${c.firstName} ${c.lastName}`, sublabel: c.position ?? "Contact", href: `/contacts/${c.id}` });
  }
  for (const t of tasks) {
    items.push({ id: t.id, type: "task", label: t.title, sublabel: "Tâche", href: `/tasks` });
  }
  for (const n of notes) {
    items.push({ id: n.id, type: "note", label: n.title ?? n.content.slice(0, 60), sublabel: "Note", href: n.applicationId ? `/applications/${n.applicationId}` : "/" });
  }
  for (const d of documents) {
    items.push({ id: d.id, type: "document", label: d.name, sublabel: "Document", href: "/documents" });
  }
  for (const r of research) {
    items.push({ id: r.id, type: "research", label: r.title, sublabel: "Recherche", href: "/research" });
  }
  for (const i of interviews) {
    items.push({ id: i.id, type: "interview", label: `${i.roundLabel} — ${i.application.company.name}`, sublabel: "Entretien", href: `/applications/${i.applicationId}` });
  }

  return items;
}
