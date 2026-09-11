import { prisma } from "@/lib/prisma";

export async function getLeads() {
  return prisma.lead.findMany({
    where: { status: "NEW" },
    orderBy: { createdAt: "desc" },
  });
}
