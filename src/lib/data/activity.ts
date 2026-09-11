import { prisma } from "@/lib/prisma";

export type ActivityType =
  | "CREATED"
  | "STATUS_CHANGE"
  | "APPLIED"
  | "FOLLOW_UP"
  | "NOTE"
  | "DOCUMENT"
  | "INTERVIEW_PREP"
  | "COVER_LETTER";

/**
 * Appends one entry to an application's timeline. Best-effort: a logging
 * failure must never break the underlying mutation the user asked for.
 */
export async function logActivity(applicationId: string, type: ActivityType, summary: string) {
  try {
    await prisma.activity.create({ data: { applicationId, type, summary } });
  } catch (error) {
    console.error("Failed to log activity:", error instanceof Error ? error.message : error);
  }
}

export async function getApplicationTimeline(applicationId: string) {
  return prisma.activity.findMany({
    where: { applicationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
