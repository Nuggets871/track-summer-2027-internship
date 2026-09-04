import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { colorFor, labelFor, matchLabel, ELIGIBILITY_STATUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ScoreFactor } from "@/lib/job-matching";

export type MatchScoreCardData = {
  total: number;
  factors: ScoreFactor[];
  strengths: string[];
  watchouts: string[];
  missingSkills: string[];
  recommendation: string;
};

export type EligibilityCardData = {
  status: string;
  notes: string[];
};

function scoreColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#f87171";
}

function verdict(score: number, eligibilityStatus: string, evidenceCount: number) {
  if (evidenceCount === 0) return "Compatibilité à confirmer";
  if (eligibilityStatus === "POSSIBLY_NOT_ELIGIBLE") return "Blocage possible";
  if (score >= 75) return "Compatibilité forte";
  if (score >= 55) return "Candidature plausible";
  return "Candidature ambitieuse";
}

export function MatchScoreCard({ match, eligibility, onConfirmSkill, pending = false }: {
  match: MatchScoreCardData;
  eligibility: EligibilityCardData;
  onConfirmSkill?: (skill: string) => void;
  pending?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted/40 p-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-lg font-semibold text-foreground">{verdict(match.total, eligibility.status, match.factors.length)}</span>
            <span className="text-xs text-muted-foreground">{match.factors.length ? `Estimation : ${match.total}%` : "Données insuffisantes"}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{match.factors.length ? `${matchLabel(match.total)} · à vérifier` : "Aucun signal explicite"}</p>
            <Badge
              variant="outline"
              dotColor={colorFor(ELIGIBILITY_STATUSES, eligibility.status)}
              className="mt-1"
            >
              Eligibility : {labelFor(ELIGIBILITY_STATUSES, eligibility.status)}
            </Badge>
          </div>
        </div>
        {match.factors.length > 0 && <Progress value={match.total} className="w-full max-w-[160px]" color={scoreColor(match.total)} />}
      </div>

      {match.factors.length > 0 && <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pourquoi ce score ?</h4>
        <div className="flex flex-col gap-2">
          {match.factors.map((f) => (
            <div key={f.key} className="flex items-center gap-3">
              <span className="w-44 shrink-0 text-xs text-muted-foreground">
                {f.label} <span className="text-subtle-foreground">({f.weight}%)</span>
              </span>
              <Progress value={f.value} className="flex-1" />
              <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">{Math.round(f.value)}%</span>
            </div>
          ))}
        </div>
      </div>}

      {(match.strengths.length > 0 || match.watchouts.length > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {match.strengths.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Points forts</h4>
              <ul className="flex flex-col gap-1">
                {match.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-1.5 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.watchouts.length > 0 && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Points de vigilance</h4>
              <ul className="flex flex-col gap-1">
                {match.watchouts.map((w) => (
                  <li key={w} className="flex items-start gap-1.5 text-sm text-foreground">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {match.missingSkills.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Non trouvées dans ton profil</h4>
          <p className="mb-2 text-xs text-muted-foreground">Si tu maîtrises réellement une technologie, ajoute-la sans quitter l’analyse.</p>
          <div className="flex flex-wrap gap-1.5">
            {match.missingSkills.map((s) => (
              <div key={s} className="flex items-center rounded-md border border-danger/30 bg-danger-soft">
                <Badge variant="danger" className="border-0 bg-transparent">{s}</Badge>
                {onConfirmSkill && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" disabled={pending} onClick={() => onConfirmSkill(s)}>
                    <Plus className="size-3" /> Je l&apos;ai
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {eligibility.notes.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-md border border-warning/30 bg-warning-soft/40 p-3">
          {eligibility.notes.map((n) => (
            <p key={n} className="flex items-start gap-1.5 text-sm text-foreground">
              <XCircle className="mt-0.5 size-3.5 shrink-0 text-warning" />
              {n}
            </p>
          ))}
        </div>
      )}

      <div className={cn("flex items-start gap-2 rounded-md border border-primary/30 bg-primary-soft/50 p-3")}>
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-soft-foreground">Recommandation</p>
          <p className="text-sm text-foreground">{match.recommendation}</p>
        </div>
      </div>
    </div>
  );
}
