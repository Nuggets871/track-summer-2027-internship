import { prisma } from "@/lib/prisma";

/** Published offers staged by the MCP "addInternships" tool. */
export async function getAdvertisedLeads() {
  return prisma.lead.findMany({
    where: { status: "NEW", kind: "ADVERTISED" },
    orderBy: { createdAt: "desc" },
  });
}

/** Spontaneous targets staged by the MCP "addSpontaneousTargets" tool. */
export async function getSpontaneousLeads() {
  return prisma.lead.findMany({
    where: { status: "NEW", kind: "SPONTANEOUS" },
    orderBy: { createdAt: "desc" },
  });
}
