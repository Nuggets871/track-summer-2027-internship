"use client";

import Link from "next/link";
import { Loader2, ExternalLink, Bookmark, Send, ClipboardCheck, ArrowLeft, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField, FormSection } from "@/components/forms/form-field";
import { MatchScoreCard } from "@/components/job-import/match-score-card";
import { EXTRACTION_METHODS, labelFor } from "@/lib/constants";
import type { JobImportFlow } from "@/components/job-import/use-job-import-flow";

export function JobImportEntryStep({ flow }: { flow: JobImportFlow }) {
  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="job-url">Coller le lien de l&apos;offre</Label>
      <div className="flex gap-2">
        <Input
          id="job-url"
          placeholder="https://company.com/jobs/internship-123"
          value={flow.url}
          onChange={(e) => flow.setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && flow.submitUrl()}
          autoFocus
        />
        <Button onClick={flow.submitUrl} disabled={!flow.url.trim() || flow.pending}>
          Analyser
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        L&apos;offre est analysée automatiquement (données structurées de la page, puis analyse du texte) et un
        score de correspondance avec ton profil est calculé — rien n&apos;est enregistré avant que tu valides.
      </p>
    </div>
  );
}

export function JobImportAnalyzingStep() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Analyse de l&apos;offre en cours...</p>
    </div>
  );
}

export function JobImportPasteFallbackStep({ flow }: { flow: JobImportFlow }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-foreground">
        {flow.initialMode === "description" ? "Colle la description de l’offre." : "Impossible de lire automatiquement cette page."}
      </p>
      <p className="text-sm text-muted-foreground">
        {flow.initialMode === "description"
          ? "Le texte sera extrait puis comparé à ton profil. Rien ne sera enregistré avant ta validation."
          : "Certains sites, dont LinkedIn, bloquent la lecture automatique. Colle la description ci-dessous pour poursuivre."}
      </p>
      <Textarea
        rows={10}
        placeholder="Collez ici la description complète de l'offre (intitulé, entreprise, missions, profil recherché...)"
        value={flow.pastedText}
        onChange={(e) => flow.setPastedText(e.target.value)}
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={flow.reset}>
          Annuler
        </Button>
        <Button size="sm" onClick={flow.submitPastedText} disabled={flow.pending}>
          Analyser le texte
        </Button>
      </div>
    </div>
  );
}

export function JobImportReviewStep({ flow }: { flow: JobImportFlow }) {
  const { payload, fields } = flow;
  if (!payload || !fields) return null;

  if (flow.step === "already_applied") {
    return (
      <div className="flex flex-col gap-4">
        <button onClick={() => flow.setStep("review")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Retour
        </button>
        <p className="text-sm text-muted-foreground">
          Quelques informations complémentaires, puis c&apos;est enregistré comme <strong>Candidature envoyée</strong>.
        </p>
        <FormSection title="Candidature déjà envoyée">
          <FormField label="Date de candidature">
            <Input type="date" value={flow.appliedAt} onChange={(e) => flow.setAppliedAt(e.target.value)} />
          </FormField>
          <FormField label="Source">
            <Input placeholder="LinkedIn, site entreprise..." value={flow.source} onChange={(e) => flow.setSource(e.target.value)} />
          </FormField>
          <FormField label="Prochaine action" className="sm:col-span-2">
            <Input placeholder="Relancer dans 2 semaines..." value={flow.nextAction} onChange={(e) => flow.setNextAction(e.target.value)} />
          </FormField>
          <FormField label="Note" className="sm:col-span-2">
            <Textarea rows={2} placeholder="Optionnel" value={flow.applicationNote} onChange={(e) => flow.setApplicationNote(e.target.value)} />
          </FormField>
        </FormSection>
        <p className="text-xs text-subtle-foreground">
          Le CV et la lettre de motivation utilisés se gèrent depuis ton profil et la fiche de l&apos;offre.
        </p>
        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={() => flow.save("ALREADY_APPLIED")} disabled={flow.pending}>
            <Send /> Enregistrer comme envoyée
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {payload.duplicate && !flow.ignoreDuplicate && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-warning-soft/50 p-3">
          <p className="text-sm text-foreground">Cette opportunité semble déjà exister : {payload.duplicate.companyName} — {payload.duplicate.title}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/opportunities/${payload.duplicate.id}`}>Ouvrir l&apos;existant</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={() => flow.setIgnoreDuplicate(true)}>
              Ajouter quand même
            </Button>
          </div>
        </div>
      )}

      <MatchScoreCard match={payload.match} eligibility={payload.eligibility} onConfirmSkill={flow.confirmSkill} pending={flow.pending} />

      <details className="group rounded-lg border border-border p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-foreground">
          Corriger les informations extraites
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Informations détectées</h4>
          <span className="text-xs text-subtle-foreground">{labelFor(EXTRACTION_METHODS, payload.extracted.extractionMethod)}</span>
        </div>
        <FormSection title="Poste">
          <FormField label="Intitulé du poste" required>
            <Input value={fields.title} onChange={(e) => flow.updateField("title", e.target.value)} placeholder="Non renseigné" />
          </FormField>
          <FormField label="Entreprise" required>
            <Input value={fields.companyName} onChange={(e) => flow.updateField("companyName", e.target.value)} placeholder="Non renseigné" />
          </FormField>
          <FormField label="Ville">
            <Input value={fields.city} onChange={(e) => flow.updateField("city", e.target.value)} placeholder="Non renseigné" />
          </FormField>
          <FormField label="Pays">
            <Input value={fields.countryName} onChange={(e) => flow.updateField("countryName", e.target.value)} placeholder="Non renseigné" />
          </FormField>
          <FormField label="Modalité">
            <Select value={fields.remoteType || "NONE"} onValueChange={(v) => flow.updateField("remoteType", v === "NONE" ? "" : (v as "REMOTE" | "HYBRID" | "ONSITE"))}>
              <SelectTrigger>
                <SelectValue placeholder="Non renseigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Non renseigné</SelectItem>
                <SelectItem value="ONSITE">Sur site</SelectItem>
                <SelectItem value="HYBRID">Hybride</SelectItem>
                <SelectItem value="REMOTE">Remote</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Contrat">
            <Input value={payload.extracted.contractType ?? ""} disabled placeholder="Non renseigné" />
          </FormField>
        </FormSection>
        <FormSection title="Conditions" className="mt-4">
          <FormField label="Salaire">
            <Input type="number" value={fields.salaryAmount} onChange={(e) => flow.updateField("salaryAmount", e.target.value)} placeholder="Non renseigné" />
          </FormField>
          <FormField label="Devise">
            <Input value={fields.salaryCurrency} onChange={(e) => flow.updateField("salaryCurrency", e.target.value)} />
          </FormField>
          <FormField label="Durée (mois)">
            <Input type="number" value={fields.durationMonths} onChange={(e) => flow.updateField("durationMonths", e.target.value)} placeholder="Non renseigné" />
          </FormField>
          <FormField label="Date de début">
            <Input type="date" value={fields.startDate} onChange={(e) => flow.updateField("startDate", e.target.value)} />
          </FormField>
          <FormField label="Deadline">
            <Input type="date" value={fields.deadline} onChange={(e) => flow.updateField("deadline", e.target.value)} />
          </FormField>
        </FormSection>
        {(payload.extracted.responsibilities || payload.extracted.qualifications) && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {payload.extracted.responsibilities && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Responsabilités détectées</p>
                <p className="max-h-32 overflow-y-auto rounded-md border border-border bg-surface-muted/40 p-2 text-xs text-foreground">
                  {payload.extracted.responsibilities}
                </p>
              </div>
            )}
            {payload.extracted.qualifications && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Qualifications détectées</p>
                <p className="max-h-32 overflow-y-auto rounded-md border border-border bg-surface-muted/40 p-2 text-xs text-foreground">
                  {payload.extracted.qualifications}
                </p>
              </div>
            )}
          </div>
        )}
        <div className="mt-3">
          <FormField label="Notes">
            <Textarea rows={2} value={fields.notes} onChange={(e) => flow.updateField("notes", e.target.value)} />
          </FormField>
        </div>
        {flow.url && (
          <a href={flow.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
            <ExternalLink className="size-3.5" /> Voir l&apos;annonce originale
          </a>
        )}
        </div>
      </details>

      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={flow.dismiss} disabled={flow.pending}>
          <X /> Ignorer
        </Button>
        <Button variant="outline" onClick={() => flow.save("SAVE_LATER")} disabled={flow.pending}>
          <Bookmark /> Sauvegarder
        </Button>
        <Button variant="secondary" onClick={() => flow.save("ALREADY_APPLIED")} disabled={flow.pending}>
          <ClipboardCheck /> Déjà candidaté
        </Button>
        <Button onClick={() => flow.save("PREPARE")} disabled={flow.pending}>
          Préparer
        </Button>
      </div>
    </div>
  );
}
