"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Save, FileDown, FileType2, Undo2, AlertTriangle, RefreshCw, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  generateCoverLetterForApplication,
  refineCoverLetter,
  restorePreviousCoverLetter,
  saveCoverLetterContent,
} from "@/lib/actions/ai-actions";
import { inspectCoverLetterStyle } from "@/lib/ai/cover-letter-style";

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

export type StudioLetter = {
  content: string | null;
  tone: string | null;
  language: string | null;
  version: string;
  updatedAt: Date;
} | null;

export function CoverLetterStudio({
  applicationId,
  title,
  companyName,
  statusLabel,
  letter,
  aiConfigured,
  hasReference,
}: {
  applicationId: string;
  title: string;
  companyName: string;
  statusLabel: string;
  letter: StudioLetter;
  aiConfigured: boolean;
  hasReference: boolean;
}) {
  const [content, setContent] = useState(letter?.content ?? "");
  const [tone, setTone] = useState<(typeof TONES)[number]["value"]>((letter?.tone as never) ?? "PROFESSIONAL");
  const [language, setLanguage] = useState<"FR" | "EN">((letter?.language as "FR" | "EN") ?? "FR");
  const [version, setVersion] = useState<string | null>(letter?.version ?? null);
  const [instruction, setInstruction] = useState("");
  const [aiPending, startAi] = useTransition();
  const [pending, startTransition] = useTransition();

  const warnings = content ? inspectCoverLetterStyle(content, companyName) : [];
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  const requireAi = () => {
    if (!aiConfigured) {
      toast.error("Configure une clé DeepSeek dans Paramètres > IA pour utiliser l'IA.");
      return false;
    }
    return true;
  };

  const generate = () => {
    if (!requireAi()) return;
    startAi(async () => {
      const { letter: generated, usedAi } = await generateCoverLetterForApplication(applicationId, tone, language);
      setContent(generated.content ?? "");
      setVersion(generated.version);
      toast.success(usedAi ? "Lettre générée par l'IA" : "Modèle de lettre généré (IA non configurée)");
    });
  };

  const refine = (value: string) => {
    const text = value.trim();
    if (!text) return;
    if (!content.trim()) {
      toast.error("Génère d'abord une première version de la lettre.");
      return;
    }
    if (!requireAi()) return;
    startAi(async () => {
      try {
        const updated = await refineCoverLetter(applicationId, text);
        setContent(updated.content ?? "");
        setVersion(updated.version);
        setInstruction("");
        toast.success("Lettre affinée");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const save = () =>
    startTransition(async () => {
      await saveCoverLetterContent(applicationId, content);
      toast.success("Lettre enregistrée");
    });

  const restore = () =>
    startAi(async () => {
      try {
        const updated = await restorePreviousCoverLetter(applicationId);
        setContent(updated.content ?? "");
        setVersion(updated.version);
        toast.success("Version précédente restaurée");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Aucune version précédente");
      }
    });

  const download = (format: "docx" | "pdf") => {
    if (!content.trim()) {
      toast.error("La lettre est vide.");
      return;
    }
    startTransition(async () => {
      await saveCoverLetterContent(applicationId, content);
      const link = document.createElement("a");
      link.href = `/api/cover-letter/${applicationId}/${format}`;
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
          <h1 className="truncate text-xl font-semibold text-foreground">Lettre de motivation</h1>
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
          <Button size="sm" variant="outline" onClick={() => download("docx")} disabled={pending || !content.trim()}>
            <FileType2 className="size-3.5" /> Word
          </Button>
          <Button size="sm" variant="outline" onClick={() => download("pdf")} disabled={pending || !content.trim()}>
            <FileDown className="size-3.5" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Ta lettre</CardTitle>
              <CardDescription>Modifie le texte à la main ; l&apos;enregistrement et le téléchargement gardent cette version.</CardDescription>
            </div>
            <span className="text-xs text-muted-foreground">{wordCount} mot{wordCount > 1 ? "s" : ""}</span>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            {!content && (
              <div className="rounded-md border border-dashed border-border bg-surface-muted/40 p-6 text-center text-sm text-muted-foreground">
                Aucune lettre pour l&apos;instant. Génère un premier brouillon avec l&apos;IA, puis affine-le ici.
              </div>
            )}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={24}
              placeholder="Madame, Monsieur, ..."
              className="min-h-[520px] flex-1 font-serif text-[15px] leading-relaxed"
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-primary" /> Générer
              </CardTitle>
              <CardDescription>
                {hasReference
                  ? "Ancrée sur ta lettre de référence et ton profil."
                  : "Basée sur ton profil — ajoute une lettre de référence dans Profil pour caler la voix."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Ton</label>
                <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                  <SelectTrigger>
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
              </div>
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
              <Button onClick={generate} disabled={aiPending}>
                <Sparkles className="size-3.5" /> {content ? "Régénérer" : "Générer la lettre"}
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
                  placeholder="Ex : raccourcis le 2e paragraphe"
                />
                <Button size="sm" onClick={() => refine(instruction)} disabled={aiPending || !instruction.trim()}>
                  Envoyer
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {REFINE_ACTIONS.map((a) => (
                  <Button key={a.key} size="sm" variant="outline" disabled={aiPending} onClick={() => refine(a.key)}>
                    {a.label}
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
                  <AlertTriangle className="size-4 text-warning" /> Contrôle de naturel
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {warnings.map((warning) => (
                  <p key={warning.id} className="text-xs text-muted-foreground">
                    <strong className="text-foreground">{warning.label} :</strong> {warning.detail}
                  </p>
                ))}
                <p className="mt-1 text-[11px] text-subtle-foreground">
                  Ce contrôle signale des habitudes de style. Il ne prétend pas détecter si un texte vient d&apos;une IA.
                </p>
              </CardContent>
            </Card>
          )}

          {!aiConfigured && (
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft/40 p-3 text-sm text-foreground">
              <RefreshCw className="mt-0.5 size-4 shrink-0 text-warning" />
              L&apos;IA n&apos;est pas configurée : tu peux tout de même rédiger et télécharger la lettre à la main.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
