import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const contactListInclude = {
  company: true,
  country: true,
} satisfies Prisma.ContactInclude;

export type ContactWithRelations = Prisma.ContactGetPayload<{ include: typeof contactListInclude }>;

export async function getContactsWithRelations(): Promise<ContactWithRelations[]> {
  return prisma.contact.findMany({ include: contactListInclude, orderBy: { updatedAt: "desc" } });
}

export async function getContactDetail(id: string) {
  return prisma.contact.findUnique({
    where: { id },
    include: {
      company: true,
      country: true,
      interactions: { orderBy: { date: "desc" } },
      tasks: { orderBy: { dueDate: "asc" } },
      applications: { include: { status: true, company: true } },
      primaryForApplications: { include: { status: true, company: true } },
      notesList: { orderBy: { createdAt: "desc" } },
    },
  });
}
