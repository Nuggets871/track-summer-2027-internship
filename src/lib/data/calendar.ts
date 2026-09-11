import { prisma } from "@/lib/prisma";

export type CalendarEventKind = "DEADLINE" | "NEXT_ACTION" | "APPLIED";

export type CalendarEvent = {
  id: string;
  date: Date;
  kind: CalendarEventKind;
  label: string;
  href: string;
};

/** Every dated item the tracker knows about, derived live (never stored). */
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const applications = await prisma.application.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      deadline: true,
      nextAction: true,
      nextActionDate: true,
      appliedAt: true,
      company: { select: { name: true } },
    },
  });

  const events: CalendarEvent[] = [];
  for (const application of applications) {
    const href = `/opportunities/${application.id}`;
    if (application.deadline) {
      events.push({ id: `deadline-${application.id}`, date: application.deadline, kind: "DEADLINE", label: `Deadline — ${application.company.name} (${application.title})`, href });
    }
    if (application.nextActionDate) {
      events.push({ id: `action-${application.id}`, date: application.nextActionDate, kind: "NEXT_ACTION", label: `${application.nextAction || "Action"} — ${application.company.name}`, href });
    }
    if (application.appliedAt) {
      events.push({ id: `applied-${application.id}`, date: application.appliedAt, kind: "APPLIED", label: `Candidature envoyée — ${application.company.name}`, href });
    }
  }
  return events;
}
