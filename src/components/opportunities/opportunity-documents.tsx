"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadApplicationDocument, deleteApplicationDocument } from "@/lib/actions/documents";

const CATEGORY_LABELS: Record<string, string> = {
  CV: "CV",
  COVER_LETTER: "Lettre",
  TRANSCRIPT: "Relevé",
  PORTFOLIO: "Portfolio",
  RECOMMENDATION: "Recommandation",
  VISA: "Visa",
  OTHER: "Autre",
};

export type ApplicationDocument = {
  id: string;
  name: string;
  category: string;
  fileSize: number | null;
};

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function OpportunityDocuments({ applicationId, documents }: { applicationId: string; documents: ApplicationDocument[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState("CV");

  const onFile = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);
        await uploadApplicationDocument(applicationId, formData);
        toast.success("Document ajouté");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Ajout impossible");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="size-4 text-primary" /> Documents
        </CardTitle>
        <CardDescription>CV adapté, relevés, offre, recommandations… rattachés à cette candidature.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
            <Upload className="size-3.5" /> Ajouter un document
          </Button>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun document pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <a href={`/api/documents/${document.id}`} className="min-w-0 flex-1 truncate text-sm text-foreground hover:underline">
                  {document.name}
                </a>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {CATEGORY_LABELS[document.category] ?? document.category}
                  {document.fileSize ? ` · ${formatSize(document.fileSize)}` : ""}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  aria-label="Supprimer le document"
                  onClick={() => startTransition(async () => { await deleteApplicationDocument(document.id); router.refresh(); })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
