"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Application, Company, CoverLetter } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Link2, Check, ChevronDown, ExternalLink, Undo2, AlertTriangle } from "lucide-react";
import { updateApplication } from "@/lib/actions/applications";
import { generateCoverLetterForApplication, generateSpontaneousMessage, refineCoverLetter, restorePreviousCoverLetter, saveCoverLetterContent, saveSpontaneousMessage } from "@/lib/actions/ai-actions";
import type { AppProfile } from "@/lib/data/profile";
import { cn } from "@/lib/utils";
import { inspectCoverLetterStyle } from "@/lib/ai/cover-letter-style";

type ApplicationDetail = Application & { company: Company; coverLetter: CoverLetter | null };

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

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

type LinkColor = "linkedin" | "github" | "portfolio";

// Brand-associated, theme-aware (light/dark) — a soft tint at rest, filled
// in a touch more on hover so the whole chip reads as one clickable target.
const LINK_COLOR_STYLES: Record<LinkColor, string> = {
  linkedin: "border-[#0A66C2]/30 bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 dark:text-[#6DB3F2]",
  github: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 hover:bg-zinc-500/20 dark:text-zinc-300",
  portfolio: "border-violet-500/30 bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400",
};

/** A quick copy-to-clipboard chip for a profile link — most application
 * forms ask for LinkedIn/GitHub/portfolio as separate fields, so a single
 * combined "copy all" wouldn't actually save a step. The whole chip is the
 * click target (no separate button-within-a-button), and briefly flashes a
 * success tint + checkmark to confirm the copy. */
function LinkChip({ label, url, color }: { label: string; url: string; color: LinkColor }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        toast.success(`${label} copié`);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch(() => toast.error("Impossible de copier — copie le lien manuellement."));
  };

  return (
    <div className={cn("flex min-w-44 items-center justify-between rounded-lg border p-2 transition-colors", LINK_COLOR_STYLES[color])}>
      <button type="button" onClick={copy} title={`Copier le lien ${label}`} className="flex flex-1 items-center gap-2 px-1.5 py-1 text-sm font-semibold">
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />} {copied ? "Copié" : label}
      </button>
      <a href={url} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${label}`} className="rounded-md p-1.5 hover:bg-background/40">
        <ExternalLink className="size-4" />
      </a>
    </div>
  );
}

export function OpportunityApplication({ application, profile }: { application: ApplicationDetail; profile: AppProfile }) {
  const [pending, startTransition] = useTransition();
  const [letterPending, startLetterTransition] = useTransition();
  // Défaut sur aujourd'hui : on ouvre cette étape juste avant/pendant l'envoi
  // de la candidature, donc la date la plus probable est le jour même — pas
  // besoin d'ouvrir le sélecteur pour la resaisir à chaque fois. Une date déjà
  // enregistrée reste bien sûr prioritaire.
  const [appliedAt, setAppliedAt] = useState(() => toDateInput(application.appliedAt) || todayInput());
  const [nextAction, setNextAction] = useState(application.nextAction ?? "");
  const [nextActionDate, setNextActionDate] = useState(toDateInput(application.nextActionDate));
  const [notes, setNotes] = useState(application.notes ?? "");
  // Les champs secondaires restent repliés par défaut pour ne montrer que
  // l'essentiel — sauf s'il y a déjà des données dedans, pour ne rien cacher.
  const [detailsOpen, setDetailsOpen] = useState(Boolean(application.nextAction || application.nextActionDate || application.notes));
  const [tone, setTone] = useState<(typeof TONES)[number]["value"]>((application.coverLetter?.tone as never) ?? "PROFESSIONAL");
  const [language, setLanguage] = useState<"FR" | "EN">((application.coverLetter?.language as "FR" | "EN") ?? "FR");
  const [letterContent, setLetterContent] = useState(application.coverLetter?.content ?? "");
  const [refineInstruction, setRefineInstruction] = useState("");
  const [messageDraft, setMessageDraft] = useState(application.messageDraft ?? "");
  const styleWarnings = inspectCoverLetterStyle(letterContent, application.applicationType === "SPONTANEOUS" ? application.companyResearch ? application.company.name : undefined : application.company.name);

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

  const restorePrevious = () => {
    startLetterTransition(async () => {
      try {
        const letter = await restorePreviousCoverLetter(application.id);
        setLetterContent(letter.content ?? "");
        toast.success("Version précédente restaurée");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Aucune version précédente");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Candidature</CardTitle>
        <CardDescription>Suivi de l&apos;envoi, prochaine action, et lettre de motivation.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {profile.linkedinUrl || profile.githubUrl || profile.portfolioUrl ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {profile.linkedinUrl && <LinkChip label="LinkedIn" url={profile.linkedinUrl} color="linkedin" />}
            {profile.githubUrl && <LinkChip label="GitHub" url={profile.githubUrl} color="github" />}
            {profile.portfolioUrl && <LinkChip label="Portfolio" url={profile.portfolioUrl} color="portfolio" />}
          </div>
        ) : (
          <Link href="/profile" className="text-xs text-muted-foreground hover:underline">
            Ajoute tes liens LinkedIn / GitHub / portfolio dans ton profil pour les avoir ici, prêts à copier.
          </Link>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 sm:w-56">
            <label className="text-xs font-medium text-muted-foreground">Date de candidature</label>
            <Input type="date" value={appliedAt} onChange={(e) => setAppliedAt(e.target.value)} />
          </div>

          <button
            type="button"
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown className={cn("size-3.5 transition-transform duration-200", detailsOpen && "rotate-180")} />
            {detailsOpen ? "Masquer les détails" : "Plus de détails (CV, relance, notes...)"}
          </button>

          {detailsOpen && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          )}
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
              {styleWarnings.length > 0 && (
                <div className="rounded-md border border-warning/35 bg-warning-soft/40 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground">
                    <AlertTriangle className="size-3.5 text-warning" /> Contrôle de naturel
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {styleWarnings.map((warning) => <li key={warning.id}><strong className="text-foreground">{warning.label} :</strong> {warning.detail}</li>)}
                  </ul>
                  <p className="mt-2 text-[11px] text-subtle-foreground">Ce contrôle signale des habitudes de style. Il ne prétend pas détecter si un texte vient d’une IA.</p>
                </div>
              )}
              <div className="flex gap-2">
                <Input value={refineInstruction} onChange={(e) => setRefineInstruction(e.target.value)} onKeyDown={(e) => {
                  if (e.key === "Enter" && refineInstruction.trim()) { e.preventDefault(); refine(refineInstruction); setRefineInstruction(""); }
                }} placeholder="Demande une modification précise…" />
                <Button size="sm" disabled={letterPending || !refineInstruction.trim()} onClick={() => { refine(refineInstruction); setRefineInstruction(""); }}>Envoyer</Button>
              </div>
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
                <Button size="sm" variant="ghost" onClick={restorePrevious} disabled={letterPending}>
                  <Undo2 className="size-3.5" /> Annuler la dernière version
                </Button>
              </div>
            </>
          )}
        </div>

        {application.applicationType === "SPONTANEOUS" && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-medium text-foreground">Message de prise de contact</h4>
                <p className="text-xs text-muted-foreground">Adapté au canal {application.outreachChannel?.toLowerCase() ?? "choisi"}, à copier puis envoyer toi-même.</p>
              </div>
              <Button size="sm" onClick={() => startLetterTransition(async () => {
                try { const content = await generateSpontaneousMessage(application.id); setMessageDraft(content); }
                catch (error) { toast.error(error instanceof Error ? error.message : "Erreur"); }
              })} disabled={letterPending}><Sparkles className="size-3.5" /> Générer</Button>
            </div>
            {messageDraft && (
              <>
                <Textarea rows={7} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(messageDraft).then(() => toast.success("Message copié"))}>Copier</Button>
                  <Button size="sm" variant="secondary" onClick={() => startLetterTransition(async () => { await saveSpontaneousMessage(application.id, messageDraft); toast.success("Message enregistré"); })}>Enregistrer</Button>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
