import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/data/settings";
import { TERMINAL_STAGE_KEYS } from "@/lib/constants";
import { daysUntil } from "@/lib/utils";

export type SmartAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  href: string;
  category: "deadline" | "next-action" | "stale";
  date: Date;
};

/**
 * Every alert here is derived live from opportunities using the thresholds
 * in Settings — nothing is persisted, so there is never a stale
 * notification to clean up. This is the single source for both the bell in
 * the topbar and Home's "Actions à faire".
 */
export async function getSmartAlerts(): Promise<SmartAlert[]> {
  const settings = await getSettings();
  const alerts: SmartAlert[] = [];

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
          href: `/opportunities/${app.id}`,
          date: app.deadline,
        });
      }
    }

    // 2. Next action due (follow-up, finishing an application, an
    // interview to prepare... whatever the user set as nextAction).
    if (app.nextActionDate) {
      const d = daysUntil(app.nextActionDate);
      if (d !== null && d <= 0) {
        const label = app.nextAction || "Action à faire";
        alerts.push({
          id: `next-action-${app.id}`,
          severity: d < -2 ? "critical" : "warning",
          category: "next-action",
          message: d === 0 ? `${label} — ${app.company.name} (aujourd'hui)` : `${label} — ${app.company.name} (en retard de ${-d} j)`,
          href: `/opportunities/${app.id}`,
          date: app.nextActionDate,
        });
      }
    }

    // 3. Stale opportunities (applied but silent for too long)
    const reference = app.lastInteractionAt ?? app.appliedAt ?? app.discoveredAt;
    if (reference && app.appliedAt) {
      const daysSince = -1 * (daysUntil(reference) ?? 0);
      if (daysSince > settings.staleOpportunityDays) {
        alerts.push({
          id: `stale-${app.id}`,
          severity: daysSince > settings.staleOpportunityDays * 2 ? "critical" : "warning",
          category: "stale",
          message: `${app.company.name} : sans réponse depuis ${daysSince} jours`,
          href: `/opportunities/${app.id}`,
          date: reference,
        });
      }
    }
  }

  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
    return a.date.getTime() - b.date.getTime();
  });
}
