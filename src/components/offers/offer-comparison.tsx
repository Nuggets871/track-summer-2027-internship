"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { computeOfferScores, DEFAULT_OFFER_WEIGHTS, type OfferWeights } from "@/lib/scoring";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OfferWithRelations } from "@/lib/data/offers";

const WEIGHT_LABELS: { key: keyof OfferWeights; label: string }[] = [
  { key: "salary", label: "Salaire" },
  { key: "prestige", label: "Prestige" },
  { key: "interest", label: "Intérêt" },
  { key: "learning", label: "Apprentissage" },
  { key: "network", label: "Réseau" },
  { key: "careerPotential", label: "Potentiel carrière" },
  { key: "costOfLiving", label: "Coût de la vie (inversé)" },
  { key: "visaSupport", label: "Support visa" },
  { key: "housing", label: "Logement" },
];

export function OfferComparison({ offers }: { offers: OfferWithRelations[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(offers.map((o) => o.id)));
  const [weights, setWeights] = useState<OfferWeights>(DEFAULT_OFFER_WEIGHTS);

  const active = offers.filter((o) => selected.has(o.id));
  const scores = useMemo(() => computeOfferScores(active, weights), [active, weights]);
  const ranked = [...active].sort((a, b) => (scores[b.id]?.total ?? 0) - (scores[a.id]?.total ?? 0));

  if (offers.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Aucune offre à comparer"
        description="Ajoutez une offre depuis l'onglet Overview d'une candidature une fois qu'elle en a reçu une."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Pondération des critères</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {WEIGHT_LABELS.map((w) => (
            <div key={w.key} className="flex items-center gap-2">
              <span className="w-40 shrink-0 text-xs text-muted-foreground">{w.label}</span>
              <input
                type="range"
                min={0}
                max={30}
                value={weights[w.key]}
                onChange={(e) => setWeights((prev) => ({ ...prev, [w.key]: Number(e.target.value) }))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary"
              />
              <span className="w-6 shrink-0 text-right text-xs tabular-nums text-foreground">{weights[w.key]}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {offers.map((o) => (
          <label key={o.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm">
            <Checkbox
              checked={selected.has(o.id)}
              onCheckedChange={(c) =>
                setSelected((prev) => {
                  const next = new Set(prev);
                  if (c) next.add(o.id);
                  else next.delete(o.id);
                  return next;
                })
              }
            />
            {o.company?.name ?? o.application.company.name}
          </label>
        ))}
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sélectionnez au moins une offre.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {ranked.map((o, i) => {
            const score = scores[o.id];
            return (
              <Card key={o.id} className={i === 0 ? "border-primary/50" : undefined}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-1.5">
                    {i === 0 && <Trophy className="size-4 text-warning" />}
                    <Link href={`/applications/${o.applicationId}`} className="hover:underline">
                      {o.company?.name ?? o.application.company.name}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{o.role ?? o.application.title}</p>
                    <p className="text-xs text-subtle-foreground">
                      {[o.city, o.country?.name].filter(Boolean).join(", ")}
                      {o.startDate && ` · début ${formatDate(o.startDate)}`}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tabular-nums text-foreground">{score?.total ?? 0}</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </div>
                  <Progress value={score?.total ?? 0} />
                  <p className="text-sm font-medium text-foreground">{formatCurrency(o.salaryAmount, o.currency)}{o.bonus ? ` + bonus ${formatCurrency(o.bonus, o.currency)}` : ""}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {o.housing && <Badge variant="success">Logement fourni</Badge>}
                    {o.visaSupport && <Badge variant="success">Support visa</Badge>}
                    <Badge variant="outline">{o.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
