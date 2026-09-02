import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data/settings";
import { TERMINAL_STAGE_KEYS } from "@/lib/constants";
import { daysUntil } from "@/lib/utils";

export type SmartAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  href: string;
  category: "deadline" | "follow-up" | "interview" | "contact" | "stale" | "task";
  date: Date;
};

/**
 * Every alert here is derived live from the data using the thresholds in
 * Settings > Règles de relance — nothing is persisted, so there is never a
 * stale notification to clean up.
 */
export async function getSmartAlerts(): Promise<SmartAlert[]> {
  const settings = await getSettings();
  const alerts: SmartAlert[] = [];
  const now = new Date();

  const activeApplications = await prisma.application.findMany({
    where: { status: { key: { notIn: TERMINAL_STAGE_KEYS } } },
    include: { company: true, status: true },
  });

  for (const app of activeApplications) {
    // 1. Deadlines approaching
    if (app.deadline) {
      const d = daysUntil(app.deadline);
      if (d !== null && d <= settings.deadlineWarningDays) {
        alerts.push({
          id: `deadline-${app.id}`,
          severity: d < 0 ? "critical" : d <= 1 ? "critical" : "warning",
          category: "deadline",
          message:
            d < 0
              ? `Deadline dépassée pour ${app.company.name} (${app.title})`
              : d === 0
                ? `Deadline ${app.company.name} aujourd'hui`
                : `Deadline ${app.company.name} dans ${d} jour${d > 1 ? "s" : ""}`,
          href: `/applications/${app.id}`,
          date: app.deadline,
        });
      }
    }

    // 2. Follow-ups due
    if (app.nextActionDate) {
      const d = daysUntil(app.nextActionDate);
      if (d !== null && d <= 0) {
        alerts.push({
          id: `followup-${app.id}`,
          severity: d < -2 ? "critical" : "warning",
          category: "follow-up",
          message:
            d === 0
              ? `Relance ${app.company.name} aujourd'hui${app.nextAction ? ` — ${app.nextAction}` : ""}`
              : `Relance ${app.company.name} en retard de ${-d} jour${-d > 1 ? "s" : ""}`,
          href: `/applications/${app.id}`,
          date: app.nextActionDate,
        });
      }
    }

    // 3. Stale opportunities (sent but silent for too long)
    const reference = app.lastInteractionAt ?? app.appliedAt ?? app.discoveredAt;
    if (reference) {
      const daysSince = -1 * (daysUntil(reference) ?? 0);
      if (app.appliedAt && daysSince > settings.staleOpportunityDays) {
        alerts.push({
          id: `stale-${app.id}`,
          severity: daysSince > settings.staleOpportunityDays * 2 ? "critical" : "warning",
          category: "stale",
          message: `${app.company.name} : sans réponse depuis ${daysSince} jours`,
          href: `/applications/${app.id}`,
          date: reference,
        });
      }
    }
  }

  // 4. Interviews within 48h
  const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const interviews = await prisma.interview.findMany({
    where: { status: "SCHEDULED", scheduledAt: { gte: now, lte: soon } },
    include: { application: { include: { company: true } } },
  });
  for (const itv of interviews) {
    if (!itv.scheduledAt) continue;
    const hours = Math.round((itv.scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60));
    alerts.push({
      id: `interview-${itv.id}`,
      severity: hours <= 24 ? "critical" : "warning",
      category: "interview",
      message: `${itv.roundLabel} — ${itv.application.company.name} dans ${hours}h`,
      href: `/applications/${itv.applicationId}`,
      date: itv.scheduledAt,
    });
  }

  // 5. Contacts gone silent
  const contacts = await prisma.contact.findMany({
    where: { lastInteractionAt: { not: null } },
  });
  for (const c of contacts) {
    const daysSince = -1 * (daysUntil(c.lastInteractionAt) ?? 0);
    if (daysSince > settings.contactSilenceDays) {
      alerts.push({
        id: `contact-${c.id}`,
        severity: "info",
        category: "contact",
        message: `Aucune interaction avec ${c.firstName} ${c.lastName} depuis ${daysSince} jours`,
        href: `/contacts/${c.id}`,
        date: c.lastInteractionAt!,
      });
    }
  }

  // 6. Contacts with an explicit follow-up date due
  const dueContacts = await prisma.contact.findMany({
    where: { nextFollowUpDate: { lte: now } },
  });
  for (const c of dueContacts) {
    alerts.push({
      id: `contact-followup-${c.id}`,
      severity: "warning",
      category: "contact",
      message: `Relancer ${c.firstName} ${c.lastName}`,
      href: `/contacts/${c.id}`,
      date: c.nextFollowUpDate!,
    });
  }

  // 7. Overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: { status: { not: "DONE" }, dueDate: { lte: now } },
  });
  for (const t of overdueTasks) {
    const d = daysUntil(t.dueDate);
    alerts.push({
      id: `task-${t.id}`,
      severity: d !== null && d < 0 ? "critical" : "warning",
      category: "task",
      message: `Tâche : ${t.title}`,
      href: `/tasks`,
      date: t.dueDate!,
    });
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
    return a.date.getTime() - b.date.getTime();
  });
}
