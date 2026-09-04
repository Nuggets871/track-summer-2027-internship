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
import type { AppProfile, ProfileEducation, ProfileExperience, ProfileProject } from "@/lib/data/profile";

export function ProfileForm({ profile }: { profile: AppProfile }) {
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState(profile.firstName ?? "");
  const [lastName, setLastName] = useState(profile.lastName ?? "");
  const [email, setEmail] = useState(profile.email ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [headline, setHeadline] = useState(profile.headline ?? "");
  const [summary, setSummary] = useState(profile.summary ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedinUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl ?? "");
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolioUrl ?? "");
  const [educationLevel, setEducationLevel] = useState(profile.educationLevel ?? "");
  const [fieldOfStudy, setFieldOfStudy] = useState(profile.fieldOfStudy ?? "");
  const [graduationYear, setGraduationYear] = useState(profile.graduationYear?.toString() ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState(profile.yearsOfExperience);
  const [experiences, setExperiences] = useState<ProfileExperience[]>(profile.experiences);
  const [educationHistory, setEducationHistory] = useState<ProfileEducation[]>(profile.educationHistory);
  const [projects, setProjects] = useState<ProfileProject[]>(profile.projects);
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [languages, setLanguages] = useState(
    profile.languages.length > 0 ? profile.languages : [{ language: "Anglais", level: "FLUENT" }],
  );
  const [workAuthorization, setWorkAuthorization] = useState(profile.workAuthorization ?? "");
  const [availabilityNote, setAvailabilityNote] = useState(profile.availabilityNote ?? "");
  const [availabilityStart, setAvailabilityStart] = useState(profile.availabilityStart?.toISOString().slice(0, 10) ?? "");
  const [availabilityEnd, setAvailabilityEnd] = useState(profile.availabilityEnd?.toISOString().slice(0, 10) ?? "");
  const [minDurationWeeks, setMinDurationWeeks] = useState(profile.minDurationWeeks?.toString() ?? "");
  const [maxDurationWeeks, setMaxDurationWeeks] = useState(profile.maxDurationWeeks?.toString() ?? "");

  const save = () => {
    startTransition(async () => {
      await updateProfile({
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        phone: phone || null,
        location: location || null,
        headline: headline || null,
        summary: summary || null,
        linkedinUrl: linkedinUrl || null,
        githubUrl: githubUrl || null,
        portfolioUrl: portfolioUrl || null,
        educationLevel: educationLevel || null,
        fieldOfStudy: fieldOfStudy || null,
        graduationYear: graduationYear ? Number(graduationYear) : null,
        yearsOfExperience,
        experiences: experiences.filter((e) => e.title.trim() || e.company.trim()),
        educationHistory: educationHistory.filter((e) => e.institution.trim() || e.degree.trim()),
        projects: projects.filter((p) => p.name.trim()),
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        languages: languages.filter((l) => l.language.trim()),
        workAuthorization: workAuthorization || null,
        availabilityNote: availabilityNote || null,
        availabilityStart: availabilityStart ? new Date(`${availabilityStart}T00:00:00`) : null,
        availabilityEnd: availabilityEnd ? new Date(`${availabilityEnd}T00:00:00`) : null,
        minDurationWeeks: minDurationWeeks ? Number(minDurationWeeks) : null,
        maxDurationWeeks: maxDurationWeeks ? Number(maxDurationWeeks) : null,
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
          <Field label="Localisation">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lyon, France" />
          </Field>
          <Field label="Titre professionnel">
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Étudiant ingénieur — Développeur full-stack" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Présentation">
              <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parcours académique détaillé</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {educationHistory.map((education, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <Input value={education.degree} placeholder="Diplôme" onChange={(e) => setEducationHistory((prev) => prev.map((item, index) => index === i ? { ...item, degree: e.target.value } : item))} />
                <Input value={education.institution} placeholder="Établissement" onChange={(e) => setEducationHistory((prev) => prev.map((item, index) => index === i ? { ...item, institution: e.target.value } : item))} />
                <button className="text-muted-foreground hover:text-danger" onClick={() => setEducationHistory((prev) => prev.filter((_, index) => index !== i))}><Trash2 className="size-4" /></button>
              </div>
              <div className="flex gap-2">
                <Input value={education.startDate ?? ""} placeholder="Début" onChange={(e) => setEducationHistory((prev) => prev.map((item, index) => index === i ? { ...item, startDate: e.target.value } : item))} />
                <Input value={education.endDate ?? ""} placeholder="Fin" onChange={(e) => setEducationHistory((prev) => prev.map((item, index) => index === i ? { ...item, endDate: e.target.value } : item))} />
              </div>
              <Textarea rows={2} value={education.description ?? ""} placeholder="Contenu de la formation" onChange={(e) => setEducationHistory((prev) => prev.map((item, index) => index === i ? { ...item, description: e.target.value } : item))} />
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={() => setEducationHistory((prev) => [...prev, { institution: "", degree: "", startDate: null, endDate: null, description: null }])}><Plus /> Ajouter une formation</Button>
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
          <CardTitle>Projets</CardTitle>
          <CardDescription>Ces détails servent de preuves concrètes dans les lettres, le CV et les préparations d’entretien.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {projects.map((project, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <Input value={project.name} placeholder="Nom du projet" onChange={(e) => setProjects((prev) => prev.map((item, index) => index === i ? { ...item, name: e.target.value } : item))} />
                <button className="text-muted-foreground hover:text-danger" onClick={() => setProjects((prev) => prev.filter((_, index) => index !== i))}><Trash2 className="size-4" /></button>
              </div>
              <Textarea rows={3} value={project.description} placeholder="Objectif, fonctionnalités et contribution personnelle" onChange={(e) => setProjects((prev) => prev.map((item, index) => index === i ? { ...item, description: e.target.value } : item))} />
              <Input value={project.technologies.join(", ")} placeholder="Technologies, séparées par des virgules" onChange={(e) => setProjects((prev) => prev.map((item, index) => index === i ? { ...item, technologies: e.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : item))} />
              <div className="flex gap-2">
                <Input value={project.url ?? ""} placeholder="URL de démonstration" onChange={(e) => setProjects((prev) => prev.map((item, index) => index === i ? { ...item, url: e.target.value || null } : item))} />
                <Input value={project.repositoryUrl ?? ""} placeholder="URL du dépôt" onChange={(e) => setProjects((prev) => prev.map((item, index) => index === i ? { ...item, repositoryUrl: e.target.value || null } : item))} />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={() => setProjects((prev) => [...prev, { name: "", description: "", technologies: [], url: null, repositoryUrl: null }])}><Plus /> Ajouter un projet</Button>
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
              <Input
                className="flex-1"
                value={lang.detail ?? ""}
                onChange={(e) => setLanguages((prev) => prev.map((l, idx) => (idx === i ? { ...l, detail: e.target.value || null } : l)))}
                placeholder="Ex : C1 — TOEIC 950/990"
              />
              <button className="text-muted-foreground hover:text-danger" onClick={() => setLanguages((prev) => prev.filter((_, idx) => idx !== i))}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={() => setLanguages((prev) => [...prev, { language: "", level: "INTERMEDIATE", detail: null }])}>
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
          <Field label="Notes de disponibilité">
            <Textarea rows={2} value={availabilityNote} onChange={(e) => setAvailabilityNote(e.target.value)} placeholder="Contraintes ou précisions complémentaires..." />
          </Field>
          <Field label="Disponible à partir du">
            <Input type="date" value={availabilityStart} onChange={(e) => setAvailabilityStart(e.target.value)} />
          </Field>
          <Field label="Disponible jusqu’au">
            <Input type="date" value={availabilityEnd} onChange={(e) => setAvailabilityEnd(e.target.value)} />
          </Field>
          <Field label="Durée minimale (semaines)">
            <Input type="number" min={1} value={minDurationWeeks} onChange={(e) => setMinDurationWeeks(e.target.value)} placeholder="9" />
          </Field>
          <Field label="Durée maximale (semaines, facultatif)">
            <Input type="number" min={1} value={maxDurationWeeks} onChange={(e) => setMaxDurationWeeks(e.target.value)} placeholder="Facultatif" />
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Ces valeurs sont des contraintes strictes : une offre dont les dates ou la durée sont incompatibles sera signalée comme bloquante.
          </p>
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
