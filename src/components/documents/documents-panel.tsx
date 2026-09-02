"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Trash2, Upload, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { uploadDocument, deleteDocument } from "@/lib/actions/documents";
import { DOCUMENT_CATEGORIES, labelFor } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Document } from "@prisma/client";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function DocumentsPanel({
  documents,
  applicationId,
  companyId,
  compact,
}: {
  documents: Document[];
  applicationId?: string;
  companyId?: string;
  compact?: boolean;
}) {
  const [category, setCategory] = useState("CV");
  const [version, setVersion] = useState("");
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (file: File) => {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("name", file.name.replace(/\.[^.]+$/, ""));
    formData.set("category", category);
    formData.set("version", version);
    if (applicationId) formData.set("applicationId", applicationId);
    if (companyId) formData.set("companyId", companyId);

    startTransition(async () => {
      try {
        await uploadDocument(formData);
        toast.success("Document ajouté");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Échec de l'upload");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border p-3">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Version (ex: v3)" value={version} onChange={(e) => setVersion(e.target.value)} className="w-36" />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={pending}>
          <Upload /> {pending ? "Envoi..." : "Téléverser un fichier"}
        </Button>
      </div>

      {documents.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Aucun document" />
      ) : (
        <div className={cn("grid grid-cols-1 gap-2", !compact && "sm:grid-cols-2")}>
          {documents.map((doc) => (
            <Card key={doc.id} className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.version && `${doc.version} · `}
                  {formatSize(doc.fileSize)} · {formatDate(doc.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline">{labelFor(DOCUMENT_CATEGORIES, doc.category)}</Badge>
                <a href={`/api/documents/${doc.id}`} className="text-muted-foreground hover:text-foreground">
                  <Download className="size-4" />
                </a>
                <button
                  className="text-muted-foreground hover:text-danger"
                  onClick={() => {
                    if (confirm("Supprimer ce document ?")) startTransition(() => deleteDocument(doc.id));
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
