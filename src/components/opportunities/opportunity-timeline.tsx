import type { Activity } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarClock } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  CREATED: "Création",
  STATUS_CHANGE: "Statut",
  APPLIED: "Candidature",
  FOLLOW_UP: "Relance",
  NOTE: "Note",
  DOCUMENT: "Document",
  INTERVIEW_PREP: "Entretien",
  COVER_LETTER: "Lettre",
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function OpportunityTimeline({ activities }: { activities: Activity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-primary" /> Activité
        </CardTitle>
        <CardDescription>Ce qui s&apos;est passé sur cette candidature, dans l&apos;ordre chronologique.</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <EmptyState title="Aucune activité" description="Les changements de statut et les actions apparaîtront ici." />
        ) : (
          <ol className="relative flex flex-col gap-4 border-l border-border pl-4">
            {activities.map((activity) => (
              <li key={activity.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
                <p className="text-sm text-foreground">{activity.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {TYPE_LABELS[activity.type] ?? activity.type} · {formatDateTime(activity.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
