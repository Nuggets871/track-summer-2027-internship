"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileSignature, UploadCloud, Trash2, PencilLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { importReferenceCoverLetter, saveReferenceCoverLetterText, clearReferenceCoverLetter } from "@/lib/actions/profile";
import type { AppProfile } from "@/lib/data/profile";

export function ReferenceLetterPanel({ profile }: { profile: AppProfile }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const openEditor = () => {
    setDraft(profile.coverLetterReference ?? "");
    setEditing(true);
  };

  const onFileSelected = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        await importReferenceCoverLetter(formData);
        toast.success("Lettre de référence importée");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible de lire ce fichier");
      }
    });
  };

  const save = () => {
    startTransition(async () => {
      await saveReferenceCoverLetterText(draft);
      setEditing(false);
      toast.success("Lettre de référence enregistrée");
      router.refresh();
    });
  };

  const remove = () => {
    if (!confirm("Supprimer la lettre de référence ? La génération repartira sans modèle de voix.")) return;
    startTransition(async () => {
      await clearReferenceCoverLetter();
      setEditing(false);
      toast.success("Lettre de référence supprimée");
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lettre de motivation de référence</CardTitle>
        <CardDescription>
          Ta propre lettre sert de modèle de voix et de structure lors de la génération. Elle reste stockée
          localement et ne remplace jamais ton profil.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          {profile.coverLetterReference ? (
            <>
              <FileSignature className="size-4 text-primary" /> Lettre de référence enregistrée
            </>
          ) : (
            <span className="text-muted-foreground">Aucune lettre de référence — la génération utilisera uniquement ton profil.</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md"
            className="hidden"
            onChange={(e) => {
              onFileSelected(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
            <UploadCloud className="size-3.5" /> {profile.coverLetterReference ? "Remplacer" : "Importer un fichier"}
          </Button>
          {profile.coverLetterReference && (
            <>
              <Button variant="outline" size="sm" onClick={openEditor} disabled={pending}>
                <PencilLine className="size-3.5" /> Voir / modifier le texte
              </Button>
              <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
                <Trash2 className="size-3.5" /> Supprimer
              </Button>
            </>
          )}
        </div>
      </CardContent>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Lettre de motivation de référence</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-2 pb-2">
            <p className="text-xs text-muted-foreground">
              Le texte extrait du fichier. Corrige-le si l&apos;extraction a laissé des artefacts.
            </p>
            <Textarea rows={18} value={draft} onChange={(e) => setDraft(e.target.value)} />
          </DialogBody>
          <DialogFooter className="pb-5">
            <Button variant="outline" onClick={() => setEditing(false)}>
              Annuler
            </Button>
            <Button onClick={save} disabled={pending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
