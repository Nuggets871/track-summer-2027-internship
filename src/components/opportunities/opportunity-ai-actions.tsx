"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RefreshCw, FileSearch, MessageCircleQuestion, GraduationCap, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { reanalyzeOpportunity } from "@/lib/actions/job-import";
import { improveCvForApplication, generateInterviewPrepForApplication } from "@/lib/actions/ai-actions";
import type { CvOptimizationResult } from "@/lib/ai/prompts/cv-optimization";

export function OpportunityAiActions({
  applicationId,
  aiConfigured,
  interviewPrepNotes,
  hasCv,
}: {
  applicationId: string;
  aiConfigured: boolean;
  interviewPrepNotes: string | null;
  hasCv: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [cvResult, setCvResult] = useState<CvOptimizationResult | null>(null);
  const [cvDialogOpen, setCvDialogOpen] = useState(false);
  const [prepNotes, setPrepNotes] = useState(interviewPrepNotes);

  const requireAi = (action: () => void) => {
    if (!aiConfigured) {
      toast.error("Configure une clé DeepSeek dans Paramètres > IA pour utiliser cette fonctionnalité.");
      return;
    }
    action();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actions IA</CardTitle>
        <CardDescription>
          {aiConfigured
            ? "Basées sur ton profil réel — jamais d'invention."
            : "Configure une clé DeepSeek dans Paramètres > IA pour les activer."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              requireAi(() =>
                startTransition(async () => {
                  await reanalyzeOpportunity(applicationId);
                  toast.success("Analyse relancée");
                }),
              )
            }
          >
            <RefreshCw className="size-3.5" /> Analyser à nouveau
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !hasCv}
            title={!hasCv ? "Ajoute un CV dans ton profil d'abord" : undefined}
            onClick={() =>
              requireAi(() =>
                startTransition(async () => {
                  const result = await improveCvForApplication(applicationId);
                  if (!result) {
                    toast.error("Ajoute un CV dans ton profil pour utiliser cette fonctionnalité.");
                    return;
                  }
                  setCvResult(result);
                  setCvDialogOpen(true);
                }),
              )
            }
          >
            <FileSearch className="size-3.5" /> Améliorer mon CV pour ce poste
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              requireAi(() =>
                startTransition(async () => {
                  try {
                    const content = await generateInterviewPrepForApplication(applicationId);
                    setPrepNotes(content);
                    toast.success("Préparation générée");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erreur");
                  }
                }),
              )
            }
          >
            <GraduationCap className="size-3.5" /> Préparer l&apos;entretien
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/assistant">
              <MessageCircleQuestion className="size-3.5" /> Demander à l&apos;assistant <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {prepNotes && (
          <div className="whitespace-pre-wrap rounded-md border border-border bg-surface-muted/40 p-4 text-sm text-foreground">
            {prepNotes}
          </div>
        )}
      </CardContent>

      <Dialog open={cvDialogOpen} onOpenChange={setCvDialogOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Améliorer mon CV pour ce poste</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4 pb-5">
            {cvResult && (
              <>
                {cvResult.highlights.length > 0 && (
                  <Section title="À mettre davantage en avant">
                    <ul className="list-inside list-disc text-sm text-foreground">
                      {cvResult.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </Section>
                )}
                {cvResult.missingKeywords.length > 0 && (
                  <Section title="Mots-clés absents de ton CV">
                    <div className="flex flex-wrap gap-1.5">
                      {cvResult.missingKeywords.map((k) => (
                        <Badge key={k} variant="danger">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </Section>
                )}
                {cvResult.bulletRewrites.length > 0 && (
                  <Section title="Reformulations suggérées">
                    <div className="flex flex-col gap-2">
                      {cvResult.bulletRewrites.map((r, i) => (
                        <div key={i} className="rounded-md border border-border p-2.5 text-sm">
                          <p className="text-muted-foreground line-through">{r.original}</p>
                          <p className="text-foreground">{r.improved}</p>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
                {cvResult.mostRelevantExperiences.length > 0 && (
                  <Section title="Expériences les plus pertinentes">
                    <ul className="list-inside list-disc text-sm text-foreground">
                      {cvResult.mostRelevantExperiences.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </Section>
                )}
                {cvResult.recommendedOrder.length > 0 && (
                  <Section title="Ordre recommandé">
                    <ol className="list-inside list-decimal text-sm text-foreground">
                      {cvResult.recommendedOrder.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ol>
                  </Section>
                )}
              </>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {children}
    </div>
  );
}
