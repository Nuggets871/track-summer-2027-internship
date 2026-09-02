"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateProfile } from "@/lib/actions/profile";
import { EDUCATION_LEVELS, LANGUAGE_LEVELS } from "@/lib/constants";
import type { AppProfile, ProfileExperience } from "@/lib/data/profile";

export function ProfileForm({ profile }: { profile: AppProfile }) {
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(profile.firstName ?? "");
  const [lastName, setLastName] = useState(profile.lastName ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl ?? "");
  const [educationLevel, setEducationLevel] = useState(profile.educationLevel ?? "");
  const [fieldOfStudy, setFieldOfStudy] = useState(profile.fieldOfStudy ?? "");
  const [graduationYear, setGraduationYear] = useState(profile.graduationYear?.toString() ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState(profile.yearsOfExperience);
  const [experiences, setExperiences] = useState<ProfileExperience[]>(profile.experiences);
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [languages, setLanguages] = useState(
    profile.languages.length > 0 ? profile.languages : [{ language: "Anglais", level: "FLUENT" }],
  );
  const [workAuthorization, setWorkAuthorization] = useState(profile.workAuthorization ?? "");
  const [availabilityNote, setAvailabilityNote] = useState(profile.availabilityNote ?? "");

  const save = () => {
    startTransition(async () => {
      await updateProfile({
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        phone: phone || null,
        linkedinUrl: linkedinUrl || null,
        githubUrl: githubUrl || null,
        portfolioUrl: portfolioUrl || null,
        educationLevel: educationLevel || null,
        fieldOfStudy: fieldOfStudy || null,
        graduationYear: graduationYear ? Number(graduationYear) : null,
        yearsOfExperience,
        experiences: experiences.filter((e) => e.title.trim() || e.company.trim()),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        languages: languages.filter((l) => l.language.trim()),
        workAuthorization: workAuthorization || null,
        availabilityNote: availabilityNote || null,
      });
      toast.success("Profil enregistré");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Prénom">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Nom">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Téléphone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liens</CardTitle>
          <CardDescription>
            Affichés avec un bouton de copie sur chaque candidature — pratique quand un formulaire externe les demande.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="LinkedIn">
            <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/..." />
          </Field>
          <Field label="GitHub">
            <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="github.com/..." />
          </Field>
          <Field label="Portfolio">
            <Input value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="tonsite.com" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formation</CardTitle>
          <CardDescription>Utilisée pour évaluer l&apos;éligibilité et le critère « Formation » du Match Score.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Niveau d'étude">
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
          </Field>
          <Field label="Domaine d'étude">
            <Input value={fieldOfStudy} onChange={(e) => setFieldOfStudy(e.target.value)} placeholder="Finance, Informatique..." />
          </Field>
          <Field label="Année de diplôme (prévue)">
            <Input type="number" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="2027" />
          </Field>
          <Field label="Années d'expérience">
            <Input type="number" min={0} value={yearsOfExperience} onChange={(e) => setYearsOfExperience(Number(e.target.value))} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expériences</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {experiences.map((exp, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  className="flex-1"
                  placeholder="Titre du poste"
                  value={exp.title}
                  onChange={(e) => setExperiences((prev) => prev.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))}
                />
                <Input
                  className="flex-1"
                  placeholder="Entreprise"
                  value={exp.company}
                  onChange={(e) => setExperiences((prev) => prev.map((x, idx) => (idx === i ? { ...x, company: e.target.value } : x)))}
                />
                <button
                  className="text-muted-foreground hover:text-danger"
                  onClick={() => setExperiences((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Début (2025-06)"
                  value={exp.startDate ?? ""}
                  onChange={(e) => setExperiences((prev) => prev.map((x, idx) => (idx === i ? { ...x, startDate: e.target.value } : x)))}
                />
                <Input
                  placeholder="Fin (2025-08)"
                  value={exp.endDate ?? ""}
                  onChange={(e) => setExperiences((prev) => prev.map((x, idx) => (idx === i ? { ...x, endDate: e.target.value } : x)))}
                />
              </div>
              <Textarea
                rows={2}
                placeholder="Description..."
                value={exp.description ?? ""}
                onChange={(e) => setExperiences((prev) => prev.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))}
              />
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setExperiences((prev) => [...prev, { title: "", company: "", startDate: null, endDate: null, description: null }])}
          >
            <Plus /> Ajouter une expérience
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compétences</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Compétences (séparées par des virgules)">
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Excel, Python, SQL, Financial Modeling..." />
          </Field>
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
          <CardTitle>Préférences & disponibilité</CardTitle>
          <CardDescription>Notes personnelles — pas un conseil juridique.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Droit de travail / visa">
            <Textarea rows={2} value={workAuthorization} onChange={(e) => setWorkAuthorization(e.target.value)} placeholder="Ex : citoyen UE, droit de travailler sans visa dans l'UE..." />
          </Field>
          <Field label="Disponibilité">
            <Textarea rows={2} value={availabilityNote} onChange={(e) => setAvailabilityNote(e.target.value)} placeholder="Disponible été 2027, 3 à 6 mois..." />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          Enregistrer le profil
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
