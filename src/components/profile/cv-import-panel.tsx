"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { UploadCloud, FileText, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { uploadAndParseCv, applyCvToProfile, type CvParsePreview } from "@/lib/actions/profile";
import { labelFor, EDUCATION_LEVELS } from "@/lib/constants";
import type { AppProfile } from "@/lib/data/profile";

export function CvImportPanel({ profile }: { profile: AppProfile }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<CvParsePreview | null>(null);
  const [include, setInclude] = useState<Record<string, boolean>>({});

  const openFilePicker = () => inputRef.current?.click();

  const onFileSelected = (file: File | undefined) => {
    if (!file) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadAndParseCv(formData);
        if (!result.detected) {
          toast.error("L'IA n'est pas configurée — impossible d'extraire automatiquement les champs. Le texte du CV a tout de même été enregistré.");
          setPreview(result);
          setInclude({});
          return;
        }
        setPreview(result);
        setInclude({
          firstName: !!result.detected.firstName,
          lastName: !!result.detected.lastName,
          email: !!result.detected.email,
          phone: !!result.detected.phone,
          educationLevel: !!result.detected.educationLevel,
          fieldOfStudy: !!result.detected.fieldOfStudy,
          graduationYear: !!result.detected.graduationYear,
          yearsOfExperience: result.detected.yearsOfExperience !== null,
          skills: result.detected.skills.length > 0,
          languages: result.detected.languages.length > 0,
          experiences: result.detected.experiences.length > 0,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible de lire ce fichier");
      }
    });
  };

  const confirm = () => {
    if (!preview) return;
    const d = preview.detected;
    startTransition(async () => {
      await applyCvToProfile({
        documentId: preview.documentId,
        rawText: preview.rawText,
        firstName: include.firstName ? d?.firstName ?? null : null,
        lastName: include.lastName ? d?.lastName ?? null : null,
        email: include.email ? d?.email ?? null : null,
        phone: include.phone ? d?.phone ?? null : null,
        educationLevel: include.educationLevel ? d?.educationLevel ?? null : null,
        fieldOfStudy: include.fieldOfStudy ? d?.fieldOfStudy ?? null : null,
        graduationYear: include.graduationYear ? d?.graduationYear ?? null : null,
        yearsOfExperience: include.yearsOfExperience ? d?.yearsOfExperience ?? null : null,
        skills: include.skills ? d?.skills ?? [] : [],
        languages: include.languages ? d?.languages ?? [] : [],
        experiences: include.experiences ? d?.experiences ?? [] : [],
      });
      toast.success("Profil mis à jour à partir du CV");
      setPreview(null);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CV</CardTitle>
        <CardDescription>
          Importe ton CV pour pré-remplir ton profil — rien n&apos;est écrasé sans ta confirmation, champ par champ.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          {profile.cvRawText ? (
            <>
              <FileText className="size-4 text-primary" /> CV enregistré
              {profile.cvParsedAt && <span className="text-muted-foreground">(analysé le {new Date(profile.cvParsedAt).toLocaleDateString("fr-FR")})</span>}
            </>
          ) : (
            <span className="text-muted-foreground">Aucun CV importé pour l&apos;instant.</span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          className="hidden"
          onChange={(e) => onFileSelected(e.target.files?.[0])}
        />
        <Button variant="outline" size="sm" onClick={openFilePicker} disabled={pending}>
          <UploadCloud className="size-3.5" /> {profile.cvRawText ? "Remplacer le CV" : "Importer un CV"}
        </Button>
      </CardContent>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Voici ce que nous avons détecté</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3 pb-2">
            {!preview?.detected ? (
              <p className="text-sm text-muted-foreground">
                Aucune extraction automatique disponible (IA non configurée). Le texte du CV a été enregistré et pourra être utilisé pour les lettres de motivation.
              </p>
            ) : (
              <>
                <FieldRow
                  label="Nom"
                  value={[preview.detected.firstName, preview.detected.lastName].filter(Boolean).join(" ") || "Non renseigné"}
                  checked={!!include.firstName}
                  onCheckedChange={(v) => setInclude((p) => ({ ...p, firstName: v, lastName: v }))}
                  disabled={!preview.detected.firstName && !preview.detected.lastName}
                />
                <FieldRow
                  label="Email"
                  value={preview.detected.email ?? "Non renseigné"}
                  checked={!!include.email}
                  onCheckedChange={(v) => setInclude((p) => ({ ...p, email: v }))}
                  disabled={!preview.detected.email}
                />
                <FieldRow
                  label="Téléphone"
                  value={preview.detected.phone ?? "Non renseigné"}
                  checked={!!include.phone}
                  onCheckedChange={(v) => setInclude((p) => ({ ...p, phone: v }))}
                  disabled={!preview.detected.phone}
                />
                <FieldRow
                  label="Formation"
                  value={
                    preview.detected.educationLevel
                      ? `${labelFor(EDUCATION_LEVELS, preview.detected.educationLevel)}${preview.detected.fieldOfStudy ? ` — ${preview.detected.fieldOfStudy}` : ""}`
                      : "Non renseigné"
                  }
                  checked={!!include.educationLevel}
                  onCheckedChange={(v) => setInclude((p) => ({ ...p, educationLevel: v, fieldOfStudy: v }))}
                  disabled={!preview.detected.educationLevel}
                />
                <FieldRow
                  label="Année de diplôme"
                  value={preview.detected.graduationYear?.toString() ?? "Non renseigné"}
                  checked={!!include.graduationYear}
                  onCheckedChange={(v) => setInclude((p) => ({ ...p, graduationYear: v }))}
                  disabled={!preview.detected.graduationYear}
                />
                <FieldRow
                  label="Années d'expérience"
                  value={preview.detected.yearsOfExperience?.toString() ?? "Non renseigné"}
                  checked={!!include.yearsOfExperience}
                  onCheckedChange={(v) => setInclude((p) => ({ ...p, yearsOfExperience: v }))}
                  disabled={preview.detected.yearsOfExperience === null}
                />
                <FieldRow
                  label={`Compétences (${preview.detected.skills.length})`}
                  value={preview.detected.skills.join(", ") || "Non renseigné"}
                  checked={!!include.skills}
                  onCheckedChange={(v) => setInclude((p) => ({ ...p, skills: v }))}
                  disabled={preview.detected.skills.length === 0}
                />
                <FieldRow
                  label={`Langues (${preview.detected.languages.length})`}
                  value={preview.detected.languages.map((l) => l.language).join(", ") || "Non renseigné"}
                  checked={!!include.languages}
                  onCheckedChange={(v) => setInclude((p) => ({ ...p, languages: v }))}
                  disabled={preview.detected.languages.length === 0}
                />
                <FieldRow
                  label={`Expériences (${preview.detected.experiences.length})`}
                  value={preview.detected.experiences.map((e) => `${e.title} — ${e.company}`).join(", ") || "Non renseigné"}
                  checked={!!include.experiences}
                  onCheckedChange={(v) => setInclude((p) => ({ ...p, experiences: v }))}
                  disabled={preview.detected.experiences.length === 0}
                />
              </>
            )}
          </DialogBody>
          <DialogFooter className="pb-5">
            <Button variant="outline" onClick={() => setPreview(null)}>
              Annuler
            </Button>
            <Button onClick={confirm} disabled={pending}>
              <CheckCircle2 className="size-3.5" /> Appliquer au profil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function FieldRow({
  label,
  value,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  value: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2.5 rounded-md border border-border p-2.5">
      <Checkbox checked={checked} onCheckedChange={(v) => onCheckedChange(!!v)} disabled={disabled} className="mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </label>
  );
}
