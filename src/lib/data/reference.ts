import { prisma } from "@/lib/prisma";
import { ensureDefaultPipelineStages } from "@/lib/actions/backup";

/**
 * Lightweight lookup lists shared by most forms (selects, comboboxes...).
 * Kept in one place so every form uses the same shape and ordering.
 */
export async function getReferenceData() {
  await ensureDefaultPipelineStages();
  const [companies, countries, cities, contacts, stages, tags, settings, applications, documents] = await Promise.all([
    prisma.company.findMany({ select: { id: true, name: true, logoUrl: true }, orderBy: { name: "asc" } }),
    prisma.country.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.city.findMany({ select: { id: true, name: true, countryId: true }, orderBy: { name: "asc" } }),
    prisma.contact.findMany({
      select: { id: true, firstName: true, lastName: true, companyId: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.pipelineStage.findMany({ where: { kind: "APPLICATION" }, orderBy: { order: "asc" } }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.setting.findUnique({ where: { id: "singleton" } }),
    prisma.application.findMany({
      select: { id: true, title: true, companyId: true, company: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.document.findMany({
      select: { id: true, name: true, category: true, version: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    companies,
    countries,
    cities,
    contacts: contacts.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, companyId: c.companyId })),
    stages,
    tags,
    settings,
    applications: applications.map((a) => ({ id: a.id, name: `${a.company.name} — ${a.title}`, companyId: a.companyId })),
    documents,
  };
}

export type ReferenceData = Awaited<ReturnType<typeof getReferenceData>>;
