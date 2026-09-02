"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw, ExternalLink, Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchScoreCard } from "@/components/job-import/match-score-card";
import { recalculateJobMatch, generateCoverLetterDraft } from "@/lib/actions/job-import";
import { upsertCoverLetter } from "@/lib/actions/cover-letters";
import { safeJsonParse } from "@/lib/utils";
import type { ScoreFactor } from "@/lib/scoring";
import type { JobAnalysis } from "@prisma/client";

export function ApplicationPrepTab({
  applicationId,
  companyId,
  jobAnalysis,
  jobUrl,
  isStale,
}: {
  applicationId: string;
  companyId: string;
  jobAnalysis: JobAnalysis | null;
  jobUrl: string | null;
  isStale: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<string | null>(null);
  const [draftSource, setDraftSource] = useState<"ai" | "template" | null>(null);

  if (!jobAnalysis) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Pas encore d'analyse pour cette candidature"
        description="La préparation détaillée (score, compétences, brouillon de lettre) est disponible pour les candidatures importées depuis un lien d'offre."
      />
    );
  }

  const requiredSkills = safeJsonParse<string[]>(jobAnalysis.requiredSkills, []);
  const missingSkills = safeJsonParse<string[]>(jobAnalysis.missingSkills, []);
  const matchedSkills = requiredSkills.filter((s) => !missingSkills.includes(s));
  const match = {
    total: jobAnalysis.matchScore ?? 0,
    factors: safeJsonParse<ScoreFactor[]>(jobAnalysis.matchBreakdown, []),
    strengths: safeJsonParse<string[]>(jobAnalysis.strengths, []),
    watchouts: safeJsonParse<string[]>(jobAnalysis.watchouts, []),
    missingSkills,
    recommendation: jobAnalysis.recommendation ?? "",
  };
  const eligibility = {
    status: jobAnalysis.eligibilityStatus ?? "UNCLEAR",
    notes: safeJsonParse<string[]>(jobAnalysis.eligibilityNotes, []),
  };

  const generateDraft = () => {
    startTransition(async () => {
      const result = await generateCoverLetterDraft(applicationId);
      setDraft(result.content);
      setDraftSource(result.source);
    });
  };

  const saveDraftAsCoverLetter = () => {
    if (!draft) return;
    startTransition(async () => {
      await upsertCoverLetter({
        applicationId,
        companyId,
        status: "DRAFT",
        version: "v1",
        content: draft,
        personalizedElements: matchedSkills.join(", "),
        notes: draftSource === "ai" ? "Brouillon généré par IA (DeepSeek) — à relire et personnaliser." : "Brouillon généré à partir d'un modèle — à personnaliser.",
      });
      toast.success("Enregistré dans Lettres de motivation");
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {isStale && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning-soft/50 p-3">
          <p className="text-sm text-foreground">Ton profil a changé depuis cette analyse.</p>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await recalculateJobMatch(applicationId);
                toast.success("Match recalculé");
              })
            }
          >
            <RefreshCw /> Recalculate match
          </Button>
        </div>
      )}

      <MatchScoreCard match={match} eligibility={eligibility} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compétences importantes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Recommandations pour ton CV — mets en avant :</p>
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.length > 0 ? matchedSkills.map((s) => <Badge key={s} variant="success">{s}</Badge>) : <span className="text-xs text-subtle-foreground">Aucune compétence spécifique détectée</span>}
              </div>
            </div>
            {missingSkills.length > 0 && (
              <div>
                <p className="mb-1 text-xs text-muted-foreground">À développer ou mentionner si tu les as quand même :</p>
                <div className="flex flex-wrap gap-1.5">
                  {missingSkills.map((s) => <Badge key={s} variant="danger">{s}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé de l&apos;offre</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            {jobAnalysis.responsibilities && <p><span className="font-medium text-foreground">Responsabilités : </span>{jobAnalysis.responsibilities}</p>}
            {jobAnalysis.qualifications && <p><span className="font-medium text-foreground">Qualifications : </span>{jobAnalysis.qualifications}</p>}
            {!jobAnalysis.responsibilities && !jobAnalysis.qualifications && <p>Non renseigné.</p>}
            {jobUrl && (
              <a href={jobUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex w-fit items-center gap-1.5 text-primary hover:underline">
                <ExternalLink className="size-3.5" /> Voir l&apos;annonce originale
              </a>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lettre de motivation — brouillon</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={generateDraft} disabled={pending}>
              <Sparkles /> Générer un brouillon
            </Button>
          </div>
          {draft && (
            <>
              <Textarea rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-subtle-foreground">
                  {draftSource === "ai" ? "Généré par IA — à relire et personnaliser avant envoi." : "Brouillon type — à personnaliser avant envoi."}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(draft); toast.success("Copié"); }}>
                    <Copy /> Copier
                  </Button>
                  <Button size="sm" onClick={saveDraftAsCoverLetter} disabled={pending}>
                    Enregistrer comme lettre de motivation
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
