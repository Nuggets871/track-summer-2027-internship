"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Application, CoverLetter } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles } from "lucide-react";
import { updateApplication } from "@/lib/actions/applications";
import { generateCoverLetterForApplication, refineCoverLetter, saveCoverLetterContent } from "@/lib/actions/ai-actions";
import type { AppProfile } from "@/lib/data/profile";

type ApplicationDetail = Application & { coverLetter: CoverLetter | null };

const TONES = [
  { value: "PROFESSIONAL", label: "Professionnel" },
  { value: "NATURAL", label: "Naturel" },
  { value: "CONCISE", label: "Concis" },
  { value: "PERSONALIZED", label: "Très personnalisé" },
] as const;

const REFINE_ACTIONS = [
  { key: "Rends la lettre plus courte.", label: "Plus courte" },
  { key: "Rends le ton plus naturel et moins formel.", label: "Plus naturel" },
  { key: "Sois plus précis sur les éléments de l'offre.", label: "Plus spécifique" },
  { key: "Mets davantage en avant mon expérience professionnelle.", label: "Focus expérience" },
];

function toDateInput(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export function OpportunityApplication({ application, profile }: { application: ApplicationDetail; profile: AppProfile }) {
  const [pending, startTransition] = useTransition();
  const [letterPending, startLetterTransition] = useTransition();
  const [appliedAt, setAppliedAt] = useState(toDateInput(application.appliedAt));
  const [nextAction, setNextAction] = useState(application.nextAction ?? "");
  const [nextActionDate, setNextActionDate] = useState(toDateInput(application.nextActionDate));
  const [notes, setNotes] = useState(application.notes ?? "");
  const [tone, setTone] = useState<(typeof TONES)[number]["value"]>((application.coverLetter?.tone as never) ?? "PROFESSIONAL");
  const [language, setLanguage] = useState<"FR" | "EN">((application.coverLetter?.language as "FR" | "EN") ?? "FR");
  const [letterContent, setLetterContent] = useState(application.coverLetter?.content ?? "");

  const saveTracking = () => {
    startTransition(async () => {
      await updateApplication(application.id, {
        appliedAt: appliedAt ? new Date(appliedAt) : null,
        nextAction: nextAction || null,
        nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
        notes: notes || null,
      });
      toast.success("Candidature mise à jour");
    });
  };

  const generate = () => {
    startLetterTransition(async () => {
      const { letter, usedAi } = await generateCoverLetterForApplication(application.id, tone, language);
      setLetterContent(letter.content ?? "");
      toast.success(usedAi ? "Lettre générée par l'IA" : "Modèle de lettre généré (IA non configurée)");
    });
  };

  const refine = (instruction: string) => {
    startLetterTransition(async () => {
      try {
        const letter = await refineCoverLetter(application.id, instruction);
        setLetterContent(letter.content ?? "");
        toast.success("Lettre affinée");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const saveLetter = () => {
    startLetterTransition(async () => {
      await saveCoverLetterContent(application.id, letterContent);
      toast.success("Lettre enregistrée");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Candidature</CardTitle>
        <CardDescription>Suivi de l&apos;envoi, prochaine action, et lettre de motivation.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date de candidature</label>
            <Input type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">CV utilisé</label>
            {profile.cvRawText ? (
              <Link href="/profile" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <FileText className="size-3.5" /> CV du profil
              </Link>
            ) : (
              <Link href="/profile" className="text-sm text-muted-foreground hover:underline">
                Aucun CV — en ajouter un dans ton profil
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Prochaine action</label>
            <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Relancer, préparer l'entretien..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Date de l&apos;action</label>
            <Input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes personnelles sur cette candidature..." />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={saveTracking} disabled={pending}>
            Enregistrer
          </Button>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-foreground">Lettre de motivation</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={language} onValueChange={(v) => setLanguage(v as "FR" | "EN")}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FR">Français</SelectItem>
                  <SelectItem value="EN">English</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={generate} disabled={letterPending}>
                <Sparkles className="size-3.5" /> {letterContent ? "Régénérer" : "Générer"}
              </Button>
            </div>
          </div>

          {letterContent && (
            <>
              <Textarea rows={10} value={letterContent} onChange={(e) => setLetterContent(e.target.value)} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {REFINE_ACTIONS.map((a) => (
                    <Button key={a.key} size="sm" variant="outline" disabled={letterPending} onClick={() => refine(a.key)}>
                      {a.label}
                    </Button>
                  ))}
                </div>
                <Button size="sm" variant="secondary" onClick={saveLetter} disabled={letterPending}>
                  Enregistrer la lettre
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
