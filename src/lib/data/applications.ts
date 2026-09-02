import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const applicationListInclude = {
  company: true,
  country: true,
  city: true,
  status: true,
  jobAnalysis: { select: { matchScore: true, eligibilityStatus: true, analyzedAt: true, profileUpdatedAtSnapshot: true } },
} satisfies Prisma.ApplicationInclude;

export type ApplicationWithRelations = Prisma.ApplicationGetPayload<{ include: typeof applicationListInclude }>;

export async function getOpportunities(): Promise<ApplicationWithRelations[]> {
  return prisma.application.findMany({ include: applicationListInclude, orderBy: { updatedAt: "desc" } });
}

export async function getApplicationDetail(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      company: true,
      country: true,
      city: true,
      status: true,
      coverLetter: true,
      jobAnalysis: true,
    },
  });
}
