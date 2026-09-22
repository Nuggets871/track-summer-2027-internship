"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Save, FileDown, FileType2, Undo2, AlertTriangle, RefreshCw, Wand2, PencilLine, Eye, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { generateCvForApplication, refineCv, restorePreviousCv, saveCvContent } from "@/lib/actions/ai-actions";
import { inspectCvStyle } from "@/lib/cv-style";
import { countCvWords, emptyCvContent, type CvContent } from "@/lib/cv-content";
import { CvPreview } from "@/components/opportunities/cv-preview";

const REFINE_ACTIONS = [
  { key: "Rends le CV plus concis pour tenir sur une seule page.", label: "Tenir sur une page" },
  { key: "Réordonne les expériences et projets par pertinence pour cette offre.", label: "Réordonner par pertinence" },
  { key: "Réécris les puces avec des verbes d'action et des résultats concrets.", label: "Verbes d'action" },
  { key: "Mets davantage en avant les compétences demandées par l'offre.", label: "Insister sur les compétences clés" },
  { key: "Rends le style plus sobre et lisible par un logiciel de recrutement (ATS).", label: "Format ATS" },
];

export type StudioCv = {
  content: CvContent;
  language: string | null;
  version: string;
  updatedAt: Date;
} | null;

export function CvStudio({
  applicationId,
  title,
  companyName,
  statusLabel,
  cv,
  aiConfigured,
  hasCvSource,
  candidateName,
  contactLines,
  linkLines,
}: {
  applicationId: string;
  title: string;
  companyName: string;
  statusLabel: string;
  cv: StudioCv;
  aiConfigured: boolean;
  hasCvSource: boolean;
  candidateName: string;
  contactLines: string[];
  linkLines: string[];
}) {
  const [content, setContent] = useState<CvContent>(cv?.content ?? emptyCvContent());
  const [language, setLanguage] = useState<"FR" | "EN">((cv?.language as "FR" | "EN") ?? "FR");
  const [version, setVersion] = useState<string | null>(cv?.version ?? null);
  const [instruction, setInstruction] = useState("");
  const [editing, setEditing] = useState(false);
  const [aiPending, startAi] = useTransition();
  const [pending, startTransition] = useTransition();

  const warnings = inspectCvStyle(content);
  const wordCount = countCvWords(content);

  const mutate = (fn: (draft: CvContent) => void) =>
    setContent((prev) => {
      const draft = JSON.parse(JSON.stringify(prev)) as CvContent;
      fn(draft);
      return draft;
    });

  const generate = () =>
    startAi(async () => {
      const { cv: generated, usedAi } = await generateCvForApplication(applicationId, language);
      setContent(parseOrEmpty(generated.content));
      setVersion(generated.version);
      toast.success(usedAi ? "CV généré par l'IA" : "CV construit depuis ton profil");
    });

  const refine = (value: string) => {
    const text = value.trim();
    if (!text) return;
    if (countCvWords(content) === 0) {
      toast.error("Génère d'abord une première version du CV.");
      return;
    }
    if (!aiConfigured) {
      toast.error("Configure une clé DeepSeek dans Paramètres > IA pour utiliser l'IA.");
      return;
    }
    startAi(async () => {
      try {
        const updated = await refineCv(applicationId, text);
        setContent(parseOrEmpty(updated.content));
        setVersion(updated.version);
        setInstruction("");
        toast.success("CV affiné");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const save = () =>
    startTransition(async () => {
      await saveCvContent(applicationId, content);
      toast.success("CV enregistré");
    });

  const restore = () =>
    startAi(async () => {
      try {
        const updated = await restorePreviousCv(applicationId);
        setContent(parseOrEmpty(updated.content));
        setVersion(updated.version);
        toast.success("Version précédente restaurée");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Aucune version précédente");
      }
    });

  const download = (format: "docx" | "pdf") => {
    if (countCvWords(content) === 0) {
      toast.error("Le CV est vide.");
      return;
    }
    startTransition(async () => {
      await saveCvContent(applicationId, content);
      const link = document.createElement("a");
      link.href = `/api/cv/${applicationId}/${format}`;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Téléchargement ${format.toUpperCase()} lancé`);
    });
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/opportunities/${applicationId}`} className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Retour à l&apos;opportunité
          </Link>
          <h1 className="truncate text-xl font-semibold text-foreground">CV adapté</h1>
          <p className="text-sm text-muted-foreground">
            {companyName} · {title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{statusLabel}</Badge>
          {version && <Badge variant="outline">{version}</Badge>}
          <Button size="sm" variant="outline" onClick={save} disabled={pending}>
            <Save className="size-3.5" /> Enregistrer
          </Button>
          <Button size="sm" variant="outline" onClick={() => download("docx")} disabled={pending || wordCount === 0}>
            <FileType2 className="size-3.5" /> Word
          </Button>
          <Button size="sm" variant="outline" onClick={() => download("pdf")} disabled={pending || wordCount === 0}>
            <FileDown className="size-3.5" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Ton CV</CardTitle>
              <CardDescription>
                {editing ? "Corrige chaque rubrique, puis enregistre." : "Aperçu du document exporté en Word / PDF."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{wordCount} mot{wordCount > 1 ? "s" : ""}</span>
              <Button size="sm" variant="ghost" onClick={() => setEditing((e) => !e)}>
                {editing ? <Eye className="size-3.5" /> : <PencilLine className="size-3.5" />}
                {editing ? "Aperçu" : "Modifier"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {wordCount === 0 && !editing && (
              <div className="rounded-md border border-dashed border-border bg-surface-muted/40 p-6 text-center text-sm text-muted-foreground">
                Aucun CV pour l&apos;instant. Génère une première version (IA ou profil), puis affine-la ici.
              </div>
            )}
            {editing ? <CvEditor content={content} mutate={mutate} /> : <CvPreview content={content} candidateName={candidateName} contactLines={contactLines} linkLines={linkLines} />}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" /> Générer
              </CardTitle>
              <CardDescription>
                {aiConfigured
                  ? "Ancré sur ton profil, ton CV actuel et cette offre."
                  : "IA non configurée : un CV de base sera construit depuis ton profil."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Langue</label>
                <Select value={language} onValueChange={(v) => setLanguage(v as "FR" | "EN")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FR">Français</SelectItem>
                    <SelectItem value="EN">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!hasCvSource && (
                <p className="text-[11px] text-subtle-foreground">
                  Astuce : importe ton CV actuel dans Profil pour que la génération s&apos;appuie sur son contenu réel.
                </p>
              )}
              <Button onClick={generate} disabled={aiPending}>
                <Sparkles className="size-3.5" /> {wordCount > 0 ? "Régénérer" : "Générer le CV"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wand2 className="size-4 text-primary" /> Itérer avec l&apos;IA
              </CardTitle>
              <CardDescription>Demande une modification précise, ou pars d&apos;une suggestion.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && instruction.trim()) {
                      e.preventDefault();
                      refine(instruction);
                    }
                  }}
                  placeholder="Ex : mets en avant mon stage chez X"
                />
                <Button size="sm" onClick={() => refine(instruction)} disabled={aiPending || !instruction.trim()}>
                  Envoyer
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REFINE_ACTIONS.map((action) => (
                  <Button key={action.key} size="sm" variant="outline" disabled={aiPending} onClick={() => refine(action.key)}>
                    {action.label}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="ghost" onClick={restore} disabled={aiPending || !version}>
                <Undo2 className="size-3.5" /> Restaurer la version précédente
              </Button>
            </CardContent>
          </Card>

          {warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4 text-warning" /> Contrôle qualité
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {warnings.map((warning) => (
                  <p key={warning.id} className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{warning.label} :</strong> {warning.detail}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          {!aiConfigured && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft/40 p-3 text-sm text-foreground">
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-warning" />
              L&apos;IA n&apos;est pas configurée : tu peux générer un CV depuis ton profil, le modifier et le télécharger.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function parseOrEmpty(raw: string | null): CvContent {
  if (!raw) return emptyCvContent();
  try {
    return JSON.parse(raw) as CvContent;
  } catch {
    return emptyCvContent();
  }
}

function CvEditor({ content, mutate }: { content: CvContent; mutate: (fn: (draft: CvContent) => void) => void }) {
  const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `id-${Math.random().toString(36).slice(2)}`);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Titre / accroche du CV</label>
        <Input value={content.headline ?? ""} onChange={(e) => mutate((d) => { d.headline = e.target.value || null; })} placeholder="Ex : Élève-ingénieur en informatique" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">Résumé</label>
        <Textarea rows={3} value={content.summary ?? ""} onChange={(e) => mutate((d) => { d.summary = e.target.value || null; })} placeholder="2-3 phrases spécifiques à cette offre." />
      </div>

      {content.sections.map((section, sectionIndex) => (
        <div key={section.id} className="flex flex-col gap-3 rounded-md border border-border p-3">
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Rubrique</label>
              <Input
                value={section.title}
                onChange={(e) => mutate((d) => { d.sections[sectionIndex].title = e.target.value; })}
                placeholder="Expérience professionnelle"
              />
            </div>
            <Button size="sm" variant="ghost" onClick={() => mutate((d) => { d.sections.splice(sectionIndex, 1); })} aria-label="Supprimer la rubrique">
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          {section.entries.map((entry, entryIndex) => (
            <div key={entry.id} className="flex flex-col gap-2 rounded-md bg-surface-muted/40 p-2.5">
              <div className="flex items-start gap-2">
                <Input
                  value={entry.heading}
                  onChange={(e) => mutate((d) => { d.sections[sectionIndex].entries[entryIndex].heading = e.target.value; })}
                  placeholder="Intitulé (poste — entreprise, diplôme — école, projet)"
                />
                <Button size="sm" variant="ghost" onClick={() => mutate((d) => { d.sections[sectionIndex].entries.splice(entryIndex, 1); })} aria-label="Supprimer l'entrée">
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <Input
                value={entry.meta ?? ""}
                onChange={(e) => mutate((d) => { d.sections[sectionIndex].entries[entryIndex].meta = e.target.value || null; })}
                placeholder="Période et lieu (Ex : Juin 2025 · Paris)"
              />
              <Textarea
                rows={3}
                value={entry.bullets.join("\n")}
                onChange={(e) => mutate((d) => { d.sections[sectionIndex].entries[entryIndex].bullets = e.target.value.split("\n"); })}
                placeholder="Une puce par ligne."
              />
              <Input
                value={entry.tags.join(", ")}
                onChange={(e) => mutate((d) => { d.sections[sectionIndex].entries[entryIndex].tags = e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean); })}
                placeholder="Technologies / compétences, séparées par des virgules"
              />
            </div>
          ))}

          <Button
            size="sm"
            variant="outline"
            onClick={() => mutate((d) => { d.sections[sectionIndex].entries.push({ id: newId(), heading: "", meta: null, bullets: [], tags: [] }); })}
          >
            <Plus className="size-3.5" /> Ajouter une entrée
          </Button>
        </div>
      ))}

      <Button variant="outline" onClick={() => mutate((d) => { d.sections.push({ id: newId(), title: "Nouvelle rubrique", entries: [] }); })}>
        <Plus className="size-3.5" /> Ajouter une rubrique
      </Button>
    </div>
  );
}
