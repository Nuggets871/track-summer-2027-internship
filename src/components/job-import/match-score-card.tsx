import { CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export function MatchScoreCard({ match, eligibility }: { match: MatchScoreCardData; eligibility: EligibilityCardData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted/40 p-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-semibold tabular-nums text-foreground">{match.total}%</span>
            <span className="text-xs text-muted-foreground">Match avec ton profil</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{matchLabel(match.total)}</p>
            <Badge
              variant="outline"
              dotColor={colorFor(ELIGIBILITY_STATUSES, eligibility.status)}
              className="mt-1"
            >
              Eligibility : {labelFor(ELIGIBILITY_STATUSES, eligibility.status)}
            </Badge>
          </div>
        </div>
        <Progress value={match.total} className="w-full max-w-[160px]" color={scoreColor(match.total)} />
      </div>

      <div>
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
      </div>

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
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compétences manquantes</h4>
          <div className="flex flex-wrap gap-1.5">
            {match.missingSkills.map((s) => (
              <Badge key={s} variant="danger">
                {s}
              </Badge>
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
