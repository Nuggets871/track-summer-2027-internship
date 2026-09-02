import { getSmartAlerts } from "@/lib/data/notifications";
import { getAllTasks } from "@/lib/data/tasks";
import { getApplicationsWithScores } from "@/lib/data/applications";
import { TERMINAL_STAGE_KEYS } from "@/lib/constants";
import { daysUntil } from "@/lib/utils";
import { TodayContent } from "@/components/today/today-content";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const [alerts, tasks, applications] = await Promise.all([getSmartAlerts(), getAllTasks(), getApplicationsWithScores()]);

  const tasksToday = tasks.filter((t) => {
    if (t.status === "DONE") return false;
    const d = t.dueDate ? daysUntil(t.dueDate) : null;
    return d !== null && d <= 0;
  });

  const topPriority = applications
    .filter((a) => !TERMINAL_STAGE_KEYS.includes(a.status.key))
    .sort((a, b) => b.priorityScore.total - a.priorityScore.total)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Today</h1>
        <p className="text-sm text-muted-foreground">Que dois-je faire aujourd&apos;hui ?</p>
      </div>
      <TodayContent
        deadlineAlerts={alerts.filter((a) => a.category === "deadline")}
        followUpAlerts={alerts.filter((a) => a.category === "follow-up")}
        interviewAlerts={alerts.filter((a) => a.category === "interview")}
        contactAlerts={alerts.filter((a) => a.category === "contact")}
        staleAlerts={alerts.filter((a) => a.category === "stale")}
        tasksToday={tasksToday}
        topPriority={topPriority}
      />
    </div>
  );
}
