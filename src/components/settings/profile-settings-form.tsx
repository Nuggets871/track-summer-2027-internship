"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfile } from "@/lib/actions/profile";
import { updateSettings } from "@/lib/actions/settings";
import { EDUCATION_LEVELS, LANGUAGE_LEVELS, DEFAULT_MATCH_WEIGHTS } from "@/lib/constants";
import type { AppProfile } from "@/lib/data/profile";
import type { MatchWeights } from "@/lib/job-matching";

const WEIGHT_LABELS: { key: keyof MatchWeights; label: string }[] = [
  { key: "skills", label: "Compétences" },
  { key: "experience", label: "Expérience" },
  { key: "education", label: "Formation" },
  { key: "languages", label: "Langues" },
  { key: "location", label: "Localisation / disponibilité" },
  { key: "preferences", label: "Préférences personnelles" },
];

export function ProfileSettingsForm({ profile, matchWeights }: { profile: AppProfile; matchWeights: MatchWeights }) {
  const [pending, startTransition] = useTransition();
  const [educationLevel, setEducationLevel] = useState(profile.educationLevel ?? "");
  const [fieldOfStudy, setFieldOfStudy] = useState(profile.fieldOfStudy ?? "");
  const [graduationYear, setGraduationYear] = useState(profile.graduationYear?.toString() ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState(profile.yearsOfExperience);
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [languages, setLanguages] = useState(profile.languages.length > 0 ? profile.languages : [{ language: "Anglais", level: "FLUENT" }]);
  const [workAuthorization, setWorkAuthorization] = useState(profile.workAuthorization ?? "");
  const [availabilityNote, setAvailabilityNote] = useState(profile.availabilityNote ?? "");
  const [weights, setWeights] = useState<MatchWeights>(matchWeights);

  const saveProfile = () => {
    startTransition(async () => {
      await updateProfile({
        educationLevel: educationLevel || null,
        fieldOfStudy: fieldOfStudy || null,
        graduationYear: graduationYear ? Number(graduationYear) : null,
        yearsOfExperience,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        languages: languages.filter((l) => l.language.trim()),
        workAuthorization: workAuthorization || null,
        availabilityNote: availabilityNote || null,
      });
      await updateSettings({ matchWeights: weights });
      toast.success("Profil enregistré");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Ton profil</CardTitle>
          <CardDescription>Utilisé pour calculer le Match Score de chaque offre importée par lien.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Niveau d&apos;étude</label>
            <Select value={educationLevel} onValueChange={setEducationLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Non renseigné" />
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Domaine d&apos;étude</label>
            <Input value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} placeholder="Finance, Informatique..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Année de diplôme (prévue)</label>
            <Input type="number" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="2027" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Années d&apos;expérience</label>
            <Input type="number" min={0} value={yearsOfExperience} onChange={(e) => setYearsOfExperience(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Compétences (séparées par des virgules)</label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Excel, Python, SQL, Financial Modeling..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Langues</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {languages.map((lang, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                className="flex-1"
                value={lang.language}
                onChange={(e) => setLanguages((prev) => prev.map((l, idx) => (idx === i ? { ...l, language: e.target.value } : l)))}
                placeholder="Anglais"
              />
              <Select
                value={lang.level}
                onValueChange={(v) => setLanguages((prev) => prev.map((l, idx) => (idx === i ? { ...l, level: v } : l)))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button className="text-muted-foreground hover:text-danger" onClick={() => setLanguages((prev) => prev.filter((_, idx) => idx !== i))}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={() => setLanguages((prev) => [...prev, { language: "", level: "INTERMEDIATE" }])}>
            <Plus /> Ajouter une langue
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disponibilité & droit de travail</CardTitle>
          <CardDescription>Notes personnelles — pas un conseil juridique.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Droit de travail / visa</label>
            <Textarea rows={2} value={workAuthorization} onChange={(e) => setWorkAuthorization(e.target.value)} placeholder="Ex : citoyen UE, droit de travailler sans visa dans l'UE..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Disponibilité</label>
            <Textarea rows={2} value={availabilityNote} onChange={(e) => setAvailabilityNote(e.target.value)} placeholder="Disponible été 2027, 3 à 6 mois..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pondération du Match Score</CardTitle>
          <CardDescription>
            Match Score = Σ (poids × score du critère) — ajustable selon le type d&apos;offre.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {WEIGHT_LABELS.map((w) => (
            <div key={w.key} className="flex items-center gap-3">
              <span className="w-52 shrink-0 text-xs text-muted-foreground">{w.label}</span>
              <input
                type="range"
                min={0}
                max={50}
                value={weights[w.key]}
                onChange={(e) => setWeights((prev) => ({ ...prev, [w.key]: Number(e.target.value) }))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary"
              />
              <span className="w-8 shrink-0 text-right text-xs tabular-nums text-foreground">{weights[w.key]}</span>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setWeights(DEFAULT_MATCH_WEIGHTS)}>
            Réinitialiser aux valeurs par défaut
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveProfile} disabled={pending}>
          Enregistrer le profil
        </Button>
      </div>
    </div>
  );
}
