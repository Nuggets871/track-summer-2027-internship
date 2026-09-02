"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, Sparkles, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchScoreCard } from "@/components/job-import/match-score-card";
import { recalculateJobMatch } from "@/lib/actions/job-import";

type JobAnalysisView = {
  id: string;
  matchScore: number | null;
  eligibilityStatus: string | null;
  requiredSkillsList: string[];
  requiredLanguagesList: string[];
  matchBreakdownList: { key: string; label: string; value: number; weight: number; contribution: number }[];
  strengthsList: string[];
  watchoutsList: string[];
  missingSkillsList: string[];
  eligibilityNotesList: string[];
  recommendation: string | null;
  analyzedAt: Date;
} | null;

export function OpportunityFit({
  application,
  jobAnalysis,
  profileStale,
}: {
  application: { id: string };
  jobAnalysis: JobAnalysisView;
  profileStale: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Compatibilité</CardTitle>
          <CardDescription>Match Score & éligibilité, calculés à partir de ton profil.</CardDescription>
        </div>
        {jobAnalysis && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await recalculateJobMatch(application.id);
                toast.success("Match recalculé");
              })
            }
          >
            <RefreshCw className="size-3.5" /> Recalculer le match
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {profileStale && (
          <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning-soft/40 p-3 text-sm text-foreground">
            <AlertCircle className="size-4 shrink-0 text-warning" />
            Ton profil a changé depuis cette analyse — le score peut ne plus être à jour.
          </div>
        )}

        {!jobAnalysis ? (
          <EmptyState
            icon={Sparkles}
            title="Pas encore d'analyse"
            description="Cette opportunité n'a pas de match score calculé."
          />
        ) : (
          <MatchScoreCard
            match={{
              total: jobAnalysis.matchScore ?? 0,
              factors: jobAnalysis.matchBreakdownList,
              strengths: jobAnalysis.strengthsList,
              watchouts: jobAnalysis.watchoutsList,
              missingSkills: jobAnalysis.missingSkillsList,
              recommendation: jobAnalysis.recommendation ?? "",
            }}
            eligibility={{
              status: jobAnalysis.eligibilityStatus ?? "UNCLEAR",
              notes: jobAnalysis.eligibilityNotesList,
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
