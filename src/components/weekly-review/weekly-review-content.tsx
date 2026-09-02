"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeAndSaveWeeklyReview, updateWeeklyReviewNotes } from "@/lib/actions/weekly-review";
import { formatDate } from "@/lib/utils";
import type { WeeklyReview } from "@prisma/client";

function EditableField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => Promise<unknown> }) {
  const [v, setV] = useState(value);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Textarea rows={3} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && startTransition(async () => { await onSave(v); })} />
      {pending && <span className="text-xs text-subtle-foreground">Enregistrement...</span>}
    </div>
  );
}

function ReviewCard({ review }: { review: WeeklyReview }) {
  const metrics = [
    { label: "Candidatures envoyées", value: review.applicationsSent },
    { label: "Entreprises recherchées", value: review.companiesResearched },
    { label: "Personnes contactées", value: review.peopleContacted },
    { label: "Réponses reçues", value: review.responsesReceived },
    { label: "Calls", value: review.callsHeld },
    { label: "Entretiens", value: review.interviewsHeld },
    { label: "Refus", value: review.refusals },
    { label: "Nouvelles opportunités", value: review.newOpportunities },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Semaine du {formatDate(review.weekStart)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-md border border-border p-2.5 text-center">
              <p className="text-lg font-semibold tabular-nums text-foreground">{m.value}</p>
              <p className="text-[11px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <EditableField label="Ce qui a fonctionné" value={review.whatWorked ?? ""} onSave={(v) => updateWeeklyReviewNotes(review.id, { whatWorked: v })} />
          <EditableField label="Ce qui n'a pas fonctionné" value={review.whatDidntWork ?? ""} onSave={(v) => updateWeeklyReviewNotes(review.id, { whatDidntWork: v })} />
          <EditableField label="Priorités semaine suivante" value={review.prioritiesNextWeek ?? ""} onSave={(v) => updateWeeklyReviewNotes(review.id, { prioritiesNextWeek: v })} />
          <EditableField label="Notes personnelles" value={review.personalNotes ?? ""} onSave={(v) => updateWeeklyReviewNotes(review.id, { personalNotes: v })} />
        </div>
      </CardContent>
    </Card>
  );
}

export function WeeklyReviewContent({ reviews }: { reviews: WeeklyReview[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => startTransition(async () => { await computeAndSaveWeeklyReview(new Date()); })}
        >
          <RefreshCw /> Calculer la semaine en cours
        </Button>
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune revue hebdomadaire pour l&apos;instant. Cliquez sur le bouton ci-dessus pour générer celle de cette semaine.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}
