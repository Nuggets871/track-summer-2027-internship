import { prisma } from "@/lib/prisma";
import { TERMINAL_STAGE_KEYS } from "@/lib/constants";

export type CalendarItem = {
  id: string;
  title: string;
  type: string;
  date: Date;
  href: string;
  source: "event" | "deadline" | "task" | "interview" | "followup";
};

/**
 * Unifies calendar sources: explicit Events, application deadlines,
 * task due dates and scheduled interviews — so nothing needs to be entered
 * twice to show up on the calendar.
 */
export async function getCalendarItems(): Promise<CalendarItem[]> {
  const [events, applications, tasks, interviews] = await Promise.all([
    prisma.event.findMany(),
    prisma.application.findMany({
      where: { status: { key: { notIn: TERMINAL_STAGE_KEYS } } },
      include: { company: true, status: true },
    }),
    prisma.task.findMany({ where: { status: { not: "DONE" }, dueDate: { not: null } } }),
    prisma.interview.findMany({ where: { scheduledAt: { not: null } }, include: { application: { include: { company: true } } } }),
  ]);

  const items: CalendarItem[] = [];

  for (const e of events) {
    items.push({ id: `event-${e.id}`, title: e.title, type: e.type, date: e.date, href: e.applicationId ? `/applications/${e.applicationId}` : "/calendar", source: "event" });
  }
  for (const a of applications) {
    if (a.deadline) {
      items.push({ id: `deadline-${a.id}`, title: `Deadline — ${a.company.name}`, type: "DEADLINE", date: a.deadline, href: `/applications/${a.id}`, source: "deadline" });
    }
    if (a.nextActionDate) {
      items.push({ id: `followup-${a.id}`, title: `${a.nextAction || "Relance"} — ${a.company.name}`, type: "FOLLOW_UP", date: a.nextActionDate, href: `/applications/${a.id}`, source: "followup" });
    }
  }
  for (const t of tasks) {
    items.push({ id: `task-${t.id}`, title: t.title, type: "PERSONAL", date: t.dueDate!, href: "/tasks", source: "task" });
  }
  for (const i of interviews) {
    items.push({ id: `interview-${i.id}`, title: `${i.roundLabel} — ${i.application.company.name}`, type: "INTERVIEW", date: i.scheduledAt!, href: `/applications/${i.applicationId}`, source: "interview" });
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime());
}
