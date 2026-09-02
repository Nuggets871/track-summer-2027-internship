"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateSettings } from "@/lib/actions/settings";
import type { AppSettings } from "@/lib/data/settings";
import type { PriorityWeights } from "@/lib/scoring";

const WEIGHT_LABELS: { key: keyof PriorityWeights; label: string }[] = [
  { key: "interest", label: "Intérêt personnel" },
  { key: "deadlineProximity", label: "Proximité de la deadline" },
  { key: "fit", label: "Fit avec l'entreprise" },
  { key: "probability", label: "Probabilité estimée" },
  { key: "relationship", label: "Relation existante" },
  { key: "staleness", label: "Ancienneté excessive (pénalité)" },
];

export function ScoringSettingsForm({ settings }: { settings: AppSettings }) {
  const [pending, startTransition] = useTransition();
  const [followUpRuleDays, setFollowUpRuleDays] = useState(settings.followUpRuleDays);
  const [staleOpportunityDays, setStaleOpportunityDays] = useState(settings.staleOpportunityDays);
  const [deadlineWarningDays, setDeadlineWarningDays] = useState(settings.deadlineWarningDays);
  const [contactSilenceDays, setContactSilenceDays] = useState(settings.contactSilenceDays);
  const [weights, setWeights] = useState<PriorityWeights>(settings.priorityWeights);

  const save = () => {
    startTransition(async () => {
      await updateSettings({ followUpRuleDays, staleOpportunityDays, deadlineWarningDays, contactSilenceDays, priorityWeights: weights });
      toast.success("Règles enregistrées");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Règles de relance et d&apos;alerte</CardTitle>
          <CardDescription>Utilisées par les notifications intelligentes (Today, cloche, dashboard).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Relancer après (jours sans réponse)</label>
            <Input type="number" value={followUpRuleDays} onChange={(e) => setFollowUpRuleDays(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Opportunité stagnante après (jours)</label>
            <Input type="number" value={staleOpportunityDays} onChange={(e) => setStaleOpportunityDays(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Alerte deadline dans (jours)</label>
            <Input type="number" value={deadlineWarningDays} onChange={(e) => setDeadlineWarningDays(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Contact silencieux après (jours)</label>
            <Input type="number" value={contactSilenceDays} onChange={(e) => setContactSilenceDays(Number(e.target.value))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pondération du score de priorité</CardTitle>
          <CardDescription>Priority Score = Σ (poids × valeur du facteur) — voir le détail sur chaque candidature.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {WEIGHT_LABELS.map((w) => (
            <div key={w.key} className="flex items-center gap-3">
              <span className="w-56 shrink-0 text-xs text-muted-foreground">{w.label}</span>
              <input
                type="range"
                min={-30}
                max={30}
                value={weights[w.key]}
                onChange={(e) => setWeights((prev) => ({ ...prev, [w.key]: Number(e.target.value) }))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary"
              />
              <span className="w-8 shrink-0 text-right text-xs tabular-nums text-foreground">{weights[w.key]}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
