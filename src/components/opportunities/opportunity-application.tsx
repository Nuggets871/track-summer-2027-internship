"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Application, Company, CoverLetter } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Check, ChevronDown, ExternalLink, Globe2, ArrowRight } from "lucide-react";
import { updateApplication } from "@/lib/actions/applications";
import { generateSpontaneousMessage, saveSpontaneousMessage } from "@/lib/actions/ai-actions";
import type { AppProfile } from "@/lib/data/profile";
import { cn } from "@/lib/utils";

type ApplicationDetail = Application & { company: Company; coverLetter: CoverLetter | null };

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
        {copied ? <Check className="size-5" /> : <LinkBrandIcon brand={color} />} {copied ? "Copié" : label}
      </button>
      <a href={url} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${label}`} className="rounded-md p-1.5 hover:bg-background/40">
        <ExternalLink className="size-4" />
      </a>
    </div>
  );
}

function LinkBrandIcon({ brand }: { brand: LinkColor }) {
  if (brand === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM6.81 20.45H3.86V9h2.95v11.45ZM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45C23.2 24 24 23.23 24 22.27V1.73C24 .77 23.2 0 22.22 0h.01Z" />
      </svg>
    );
  }
  if (brand === "github") {
    return (
      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden="true">
        <path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18.76.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.48 5.92.42.36.81 1.1.81 2.22v3.29c0 .31.21.69.83.57A12 12 0 0 0 12 .3Z" />
      </svg>
    );
  }
  return <Globe2 className="size-5" aria-hidden="true" />;
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
  const [messageDraft, setMessageDraft] = useState(application.messageDraft ?? "");

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
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium text-foreground">Lettre de motivation</h4>
              <p className="text-xs text-muted-foreground">
                {application.coverLetter
                  ? `Version ${application.coverLetter.version} enregistrée — génère, itère et télécharge-la (Word / PDF) dans son espace dédié.`
                  : "Génère une lettre ancrée sur ton profil et ta lettre de référence, puis itère dans son espace dédié."}
              </p>
            </div>
            <Button asChild>
              <Link href={`/opportunities/${application.id}/letter`}>
                <Sparkles className="size-3.5" /> {application.coverLetter ? "Ouvrir la lettre" : "Préparer ma lettre"}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
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
