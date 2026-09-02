"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateSettings } from "@/lib/actions/settings";
import { DEFAULT_MATCH_WEIGHTS } from "@/lib/constants";
import type { MatchWeights } from "@/lib/job-matching";

const WEIGHT_LABELS: { key: keyof MatchWeights; label: string }[] = [
  { key: "skills", label: "Compétences" },
  { key: "experience", label: "Expérience" },
  { key: "education", label: "Formation" },
  { key: "languages", label: "Langues" },
  { key: "location", label: "Localisation / disponibilité" },
  { key: "preferences", label: "Préférences personnelles" },
];

export function MatchingSettingsForm({ matchWeights }: { matchWeights: MatchWeights }) {
  const [pending, startTransition] = useTransition();
  const [weights, setWeights] = useState<MatchWeights>(matchWeights);

  const save = () => {
    startTransition(async () => {
      await updateSettings({ matchWeights: weights });
      toast.success("Pondération enregistrée");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pondération du Match Score</CardTitle>
        <CardDescription>Match Score = Σ (poids × score du critère) — ajustable selon le type d&apos;offre que tu vises.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {WEIGHT_LABELS.map((w) => (
          <div key={w.key} className="flex items-center gap-3">
            <span className="w-52 shrink-0 text-xs text-muted-foreground">{w.label}</span>
            <input
              type="range"
              min={0}
              max={50}
              value={weights[w.key]}
              onChange={(e) => setWeights((prev) => ({ ...prev, [w.key]: Number(e.target.value) }))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary"
            />
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-foreground">{weights[w.key]}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => setWeights(DEFAULT_MATCH_WEIGHTS)}>
            Réinitialiser
          </Button>
          <Button size="sm" onClick={save} disabled={pending}>
            Enregistrer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
