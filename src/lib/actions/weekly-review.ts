"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { RESPONSE_STAGE_KEYS } from "@/lib/constants";

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday as week start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const weeklyReviewSchema = z.object({
  whatWorked: z.preprocess(emptyToNull, z.string().nullable().optional()),
  whatDidntWork: z.preprocess(emptyToNull, z.string().nullable().optional()),
  prioritiesNextWeek: z.preprocess(emptyToNull, z.string().nullable().optional()),
  personalNotes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

/**
 * Auto-computes the quantitative counters for the given week from the
 * timeline (Interaction), then upserts a WeeklyReview row so the qualitative
 * fields (what worked, priorities...) can be edited by hand.
 */
export async function computeAndSaveWeeklyReview(
  weekStartDate: Date,
  qualitative?: z.infer<typeof weeklyReviewSchema>,
) {
  const weekStart = startOfWeek(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [applicationsSent, companiesResearched, peopleContacted, interactions, newOpportunities] =
    await Promise.all([
      prisma.application.count({ where: { appliedAt: { gte: weekStart, lt: weekEnd } } }),
      prisma.company.count({ where: { createdAt: { gte: weekStart, lt: weekEnd } } }),
      prisma.interaction.count({
        where: { date: { gte: weekStart, lt: weekEnd }, type: { in: ["EMAIL", "LINKEDIN", "CALL", "MEETING"] } },
      }),
      prisma.interaction.findMany({ where: { date: { gte: weekStart, lt: weekEnd } } }),
      prisma.application.count({ where: { discoveredAt: { gte: weekStart, lt: weekEnd } } }),
    ]);

  const responsesReceived = await prisma.application.count({
    where: {
      updatedAt: { gte: weekStart, lt: weekEnd },
      status: { key: { in: RESPONSE_STAGE_KEYS } },
    },
  });
  const interviewsHeld = interactions.filter((i) => i.type === "INTERVIEW").length;
  const callsHeld = interactions.filter((i) => i.type === "CALL").length;
  const refusals = await prisma.application.count({
    where: { updatedAt: { gte: weekStart, lt: weekEnd }, status: { key: "REJECTED" } },
  });

  const data = {
    applicationsSent,
    companiesResearched,
    peopleContacted,
    responsesReceived,
    callsHeld,
    interviewsHeld,
    refusals,
    newOpportunities,
    ...(qualitative ? weeklyReviewSchema.parse(qualitative) : {}),
  };

  const review = await prisma.weeklyReview.upsert({
    where: { weekStart },
    create: { weekStart, ...data },
    update: data,
  });

  revalidatePath("/weekly-review");
  return review;
}

export async function updateWeeklyReviewNotes(id: string, raw: z.infer<typeof weeklyReviewSchema>) {
  const data = weeklyReviewSchema.parse(raw);
  const review = await prisma.weeklyReview.update({ where: { id }, data });
  revalidatePath("/weekly-review");
  return review;
}
