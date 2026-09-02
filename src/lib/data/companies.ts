import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const companyListInclude = {
  country: true,
  applications: { include: { status: true } },
  contacts: true,
  tags: true,
} satisfies Prisma.CompanyInclude;

export type CompanyWithRelations = Prisma.CompanyGetPayload<{ include: typeof companyListInclude }>;

export async function getCompaniesWithRelations(): Promise<CompanyWithRelations[]> {
  return prisma.company.findMany({ include: companyListInclude, orderBy: { updatedAt: "desc" } });
}

export async function getCompanyDetail(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: {
      country: true,
      applications: { include: { status: true }, orderBy: { createdAt: "desc" } },
      contacts: true,
      documents: true,
      notes: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { date: "asc" } },
      interactions: { orderBy: { date: "desc" }, take: 30 },
      researchItems: true,
      tags: true,
    },
  });
}
