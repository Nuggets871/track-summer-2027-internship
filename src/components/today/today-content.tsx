"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Info, Sparkles, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { TaskRow } from "@/components/tasks/task-row";
import { PRIORITY_LEVELS, labelFor, colorFor } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { SmartAlert } from "@/lib/data/notifications";
import type { TaskWithRelations } from "@/lib/data/tasks";
import type { ApplicationWithScore } from "@/lib/data/applications";

const SEVERITY_ICON = { critical: AlertTriangle, warning: Clock, info: Info } as const;
const SEVERITY_COLOR = { critical: "text-danger", warning: "text-warning", info: "text-muted-foreground" } as const;

function AlertSection({ title, alerts }: { title: string; alerts: SmartAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        {title} <span className="text-muted-foreground">({alerts.length})</span>
      </h3>
      <div className="flex flex-col gap-1.5">
        {alerts.map((a) => {
          const Icon = SEVERITY_ICON[a.severity];
          return (
            <Link key={a.id} href={a.href} className="flex items-center gap-2.5 rounded-md border border-border bg-surface p-2.5 text-sm hover:border-border-strong">
              <Icon className={`size-4 shrink-0 ${SEVERITY_COLOR[a.severity]}`} />
              <span className="flex-1">{a.message}</span>
              <span className="shrink-0 text-xs text-subtle-foreground">{formatDate(a.date)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

type FocusItem = { id: string; label: string; href: string };

export function TodayContent({
  deadlineAlerts,
  followUpAlerts,
  interviewAlerts,
  contactAlerts,
  staleAlerts,
  tasksToday,
  topPriority,
}: {
  deadlineAlerts: SmartAlert[];
  followUpAlerts: SmartAlert[];
  interviewAlerts: SmartAlert[];
  contactAlerts: SmartAlert[];
  staleAlerts: SmartAlert[];
  tasksToday: TaskWithRelations[];
  topPriority: ApplicationWithScore[];
}) {
  const [focusMode, setFocusMode] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const focusItems: FocusItem[] = [
    ...deadlineAlerts.map((a) => ({ id: a.id, label: a.message, href: a.href })),
    ...followUpAlerts.map((a) => ({ id: a.id, label: a.message, href: a.href })),
    ...tasksToday.map((t) => ({ id: t.id, label: t.title, href: t.applicationId ? `/applications/${t.applicationId}` : "/tasks" })),
    ...interviewAlerts.map((a) => ({ id: a.id, label: a.message, href: a.href })),
    ...contactAlerts.map((a) => ({ id: a.id, label: a.message, href: a.href })),
  ];

  if (focusMode) {
    const current = focusItems[focusIndex];
    return (
      <Card className="mx-auto max-w-lg p-8 text-center">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Focus {focusIndex + 1} / {focusItems.length}
        </p>
        {current ? (
          <>
            <p className="mb-6 text-lg font-medium text-foreground">{current.label}</p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={focusIndex === 0} onClick={() => setFocusIndex((i) => i - 1)}>
                <ChevronLeft /> Précédent
              </Button>
              <Button asChild size="sm">
                <Link href={current.href}>Ouvrir</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={focusIndex >= focusItems.length - 1}
                onClick={() => setFocusIndex((i) => i + 1)}
              >
                Suivant <ChevronRight />
              </Button>
            </div>
          </>
        ) : (
          <p className="mb-6 text-lg font-medium text-foreground">Tout est traité pour aujourd&apos;hui 🎉</p>
        )}
        <Button variant="ghost" size="sm" className="mt-6" onClick={() => setFocusMode(false)}>
          <X /> Quitter le mode focus
        </Button>
      </Card>
    );
  }

  const totalActions = focusItems.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-4">
        <div>
          <p className="text-sm font-medium text-foreground">{totalActions} action{totalActions !== 1 ? "s" : ""} prioritaire{totalActions !== 1 ? "s" : ""} aujourd&apos;hui</p>
          <p className="text-xs text-muted-foreground">Traitez-les une par une avec le mode focus.</p>
        </div>
        <Button size="sm" onClick={() => { setFocusIndex(0); setFocusMode(true); }} disabled={totalActions === 0}>
          <Sparkles /> Mode focus
        </Button>
      </div>

      {totalActions === 0 && staleAlerts.length === 0 && (
        <EmptyState icon={Sparkles} title="Rien d'urgent aujourd'hui" description="Profitez-en pour faire de la recherche ou du networking." />
      )}

      <AlertSection title="Deadlines urgentes" alerts={deadlineAlerts} />
      <AlertSection title="Relances à faire" alerts={followUpAlerts} />

      {tasksToday.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Candidatures à finaliser / tâches ({tasksToday.length})</h3>
          <div className="flex flex-col gap-2">
            {tasksToday.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        </div>
      )}

      <AlertSection title="Contacts à relancer" alerts={contactAlerts} />
      <AlertSection title="Entretiens à préparer" alerts={interviewAlerts} />
      <AlertSection title="Opportunités stagnantes" alerts={staleAlerts} />

      {topPriority.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Opportunités prioritaires</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {topPriority.map((app) => (
              <Link key={app.id} href={`/applications/${app.id}`}>
                <Card className="p-3">
                  <CardHeader className="p-0">
                    <CardTitle className="text-sm">{app.company.name}</CardTitle>
                    <Badge dotColor={colorFor(PRIORITY_LEVELS, app.priority)}>{labelFor(PRIORITY_LEVELS, app.priority)}</Badge>
                  </CardHeader>
                  <CardContent className="p-0 pt-2">
                    <p className="mb-1.5 text-xs text-muted-foreground">{app.title}</p>
                    <Progress value={app.priorityScore.total} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
