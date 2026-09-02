import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data/settings";
import { computePriorityScore, type ScoreResult } from "@/lib/scoring";
import { TERMINAL_STAGE_KEYS } from "@/lib/constants";
import { Prisma } from "@prisma/client";

export const applicationListInclude = {
  company: true,
  country: true,
  city: true,
  status: true,
  primaryContact: true,
  tags: true,
} satisfies Prisma.ApplicationInclude;

export type ApplicationWithRelations = Prisma.ApplicationGetPayload<{ include: typeof applicationListInclude }>;

export type ApplicationWithScore = ApplicationWithRelations & { priorityScore: ScoreResult };

export async function getApplicationsWithScores(): Promise<ApplicationWithScore[]> {
  const [applications, settings] = await Promise.all([
    prisma.application.findMany({ include: applicationListInclude, orderBy: { updatedAt: "desc" } }),
    getSettings(),
  ]);

  return applications.map((app) => {
    const priorityScore = computePriorityScore(
      {
        interestScore: app.interestScore,
        deadline: app.deadline,
        fitScore: app.company.fitScore,
        estimatedProbability: app.estimatedProbability,
        relationshipStrength: app.primaryContact?.relationshipStrength ?? null,
        lastInteractionAt: app.lastInteractionAt,
        discoveredAt: app.discoveredAt,
        isTerminal: TERMINAL_STAGE_KEYS.includes(app.status.key),
        staleThresholdDays: settings.staleOpportunityDays,
      },
      settings.priorityWeights,
    );
    return { ...app, priorityScore };
  });
}

export async function getApplicationDetail(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      company: { include: { country: true } },
      country: true,
      city: true,
      status: true,
      primaryContact: true,
      contacts: true,
      documents: true,
      tasks: { orderBy: { dueDate: "asc" } },
      events: { orderBy: { date: "asc" } },
      interactions: { orderBy: { date: "desc" } },
      interviews: { orderBy: { scheduledAt: "asc" } },
      offer: true,
      coverLetter: true,
      interviewPrep: { include: { questions: true } },
      notesList: { orderBy: { createdAt: "desc" } },
      tags: true,
    },
  });
}
