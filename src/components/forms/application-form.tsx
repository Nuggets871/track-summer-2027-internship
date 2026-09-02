"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/forms/form-field";
import { RhfSelect } from "@/components/forms/rhf-select";
import { RhfCheckbox, RhfRange } from "@/components/forms/rhf-checkbox";
import { createApplication, updateApplication, type ApplicationInput } from "@/lib/actions/applications";
import { PRIORITY_LEVELS, DEFAULT_SOURCES } from "@/lib/constants";
import type { ReferenceData } from "@/lib/data/reference";
import type { Application } from "@prisma/client";

type FormValues = {
  title: string;
  companyId: string;
  countryId: string;
  cityId: string;
  remotePossible: boolean;
  sector: string;
  department: string;
  jobUrl: string;
  source: string;
  primaryContactId: string;
  discoveredAt: string;
  appliedAt: string;
  deadline: string;
  potentialStartDate: string;
  durationMonths: string;
  salaryAmount: string;
  salaryCurrency: string;
  housingProvided: boolean;
  visaRequired: boolean;
  sponsorshipPossible: boolean;
  languageRequired: string;
  priority: string;
  interestScore: number;
  estimatedProbability: number;
  statusId: string;
  nextAction: string;
  nextActionDate: string;
  notes: string;
};

function toDateInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function defaultsFrom(app?: Application | null): Partial<FormValues> {
  if (!app) {
    return { remotePossible: false, priority: "MEDIUM", interestScore: 50, estimatedProbability: 50, salaryCurrency: "EUR" };
  }
  return {
    title: app.title,
    companyId: app.companyId,
    countryId: app.countryId ?? "",
    cityId: app.cityId ?? "",
    remotePossible: app.remotePossible,
    sector: app.sector ?? "",
    department: app.department ?? "",
    jobUrl: app.jobUrl ?? "",
    source: app.source ?? "",
    primaryContactId: app.primaryContactId ?? "",
    discoveredAt: toDateInput(app.discoveredAt),
    appliedAt: toDateInput(app.appliedAt),
    deadline: toDateInput(app.deadline),
    potentialStartDate: toDateInput(app.potentialStartDate),
    durationMonths: app.durationMonths?.toString() ?? "",
    salaryAmount: app.salaryAmount?.toString() ?? "",
    salaryCurrency: app.salaryCurrency ?? "EUR",
    housingProvided: !!app.housingProvided,
    visaRequired: !!app.visaRequired,
    sponsorshipPossible: !!app.sponsorshipPossible,
    languageRequired: app.languageRequired ?? "",
    priority: app.priority,
    interestScore: app.interestScore,
    estimatedProbability: app.estimatedProbability,
    statusId: app.statusId,
    nextAction: app.nextAction ?? "",
    nextActionDate: toDateInput(app.nextActionDate),
    notes: app.notes ?? "",
  };
}

export function ApplicationForm({
  reference,
  application,
  defaultCompanyId,
  onSuccess,
  compact,
}: {
  reference: ReferenceData;
  application?: Application | null;
  defaultCompanyId?: string;
  onSuccess?: (id: string) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control, watch } = useForm<FormValues>({
    defaultValues: { ...defaultsFrom(application), companyId: application?.companyId ?? defaultCompanyId ?? "" },
  });

  const countryId = watch("countryId");
  const cityOptions = reference.cities
    .filter((c) => !countryId || c.countryId === countryId)
    .map((c) => ({ value: c.id, label: c.name }));

  const onSubmit = (values: FormValues) => {
    const payload: ApplicationInput = {
      ...values,
      countryId: values.countryId || null,
      cityId: values.cityId || null,
      sector: values.sector || null,
      department: values.department || null,
      jobUrl: values.jobUrl || null,
      source: values.source || null,
      primaryContactId: values.primaryContactId || null,
      discoveredAt: values.discoveredAt ? new Date(values.discoveredAt) : null,
      appliedAt: values.appliedAt ? new Date(values.appliedAt) : null,
      deadline: values.deadline ? new Date(values.deadline) : null,
      potentialStartDate: values.potentialStartDate ? new Date(values.potentialStartDate) : null,
      durationMonths: values.durationMonths ? Number(values.durationMonths) : null,
      salaryAmount: values.salaryAmount ? Number(values.salaryAmount) : null,
      languageRequired: values.languageRequired || null,
      nextAction: values.nextAction || null,
      nextActionDate: values.nextActionDate ? new Date(values.nextActionDate) : null,
      notes: values.notes || null,
    } as unknown as ApplicationInput;

    startTransition(async () => {
      try {
        if (application) {
          await updateApplication(application.id, payload);
          toast.success("Candidature mise à jour");
          onSuccess?.(application.id);
        } else {
          const created = await createApplication(payload);
          toast.success("Candidature créée");
          onSuccess?.(created.id);
          if (!onSuccess) router.push(`/applications/${created.id}`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FormSection title="Poste">
        <FormField label="Intitulé du stage" htmlFor="title" required className="sm:col-span-2">
          <Input id="title" {...register("title", { required: true })} placeholder="Summer Analyst — M&A" />
        </FormField>
        <FormField label="Entreprise" required>
          <RhfSelect control={control} name="companyId" options={reference.companies.map((c) => ({ value: c.id, label: c.name }))} placeholder="Choisir..." />
        </FormField>
        <FormField label="Statut" required>
          <RhfSelect control={control} name="statusId" options={reference.stages.map((s) => ({ value: s.id, label: s.label }))} placeholder="Choisir..." />
        </FormField>
        <FormField label="Secteur">
          <Input {...register("sector")} placeholder="Finance, Tech, Conseil..." />
        </FormField>
        <FormField label="Équipe / département">
          <Input {...register("department")} />
        </FormField>
        <FormField label="Source">
          <RhfSelect control={control} name="source" options={DEFAULT_SOURCES.map((s) => ({ value: s, label: s }))} allowEmpty placeholder="Choisir..." />
        </FormField>
        <FormField label="URL de l'offre">
          <Input {...register("jobUrl")} placeholder="https://..." />
        </FormField>
      </FormSection>

      <FormSection title="Localisation">
        <FormField label="Pays">
          <RhfSelect control={control} name="countryId" options={reference.countries.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Choisir..." />
        </FormField>
        <FormField label="Ville">
          <RhfSelect control={control} name="cityId" options={cityOptions} allowEmpty placeholder="Choisir..." />
        </FormField>
        <RhfCheckbox control={control} name="remotePossible" label="Remote possible" />
      </FormSection>

      <FormSection title="Contact & dates" description="">
        <FormField label="Contact principal">
          <RhfSelect control={control} name="primaryContactId" options={reference.contacts.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Choisir..." />
        </FormField>
        <FormField label="Date de découverte">
          <Input type="date" {...register("discoveredAt")} />
        </FormField>
        <FormField label="Date de candidature">
          <Input type="date" {...register("appliedAt")} />
        </FormField>
        <FormField label="Deadline">
          <Input type="date" {...register("deadline")} />
        </FormField>
        <FormField label="Date de début potentielle">
          <Input type="date" {...register("potentialStartDate")} />
        </FormField>
        <FormField label="Durée (mois)">
          <Input type="number" min={0} {...register("durationMonths")} />
        </FormField>
      </FormSection>

      {!compact && (
        <FormSection title="Conditions">
          <FormField label="Salaire">
            <Input type="number" step="0.01" {...register("salaryAmount")} />
          </FormField>
          <FormField label="Devise">
            <Input {...register("salaryCurrency")} />
          </FormField>
          <FormField label="Langue demandée">
            <Input {...register("languageRequired")} />
          </FormField>
          <div className="flex flex-col justify-end gap-2 pb-1.5">
            <RhfCheckbox control={control} name="housingProvided" label="Logement fourni" />
            <RhfCheckbox control={control} name="visaRequired" label="Visa nécessaire" />
            <RhfCheckbox control={control} name="sponsorshipPossible" label="Sponsorship possible" />
          </div>
        </FormSection>
      )}

      <FormSection title="Priorisation">
        <FormField label="Priorité">
          <RhfSelect control={control} name="priority" options={PRIORITY_LEVELS.map((p) => ({ value: p.value, label: p.label }))} />
        </FormField>
        <div />
        <FormField label="Score d'intérêt" className="sm:col-span-2">
          <RhfRange control={control} name="interestScore" />
        </FormField>
        <FormField label="Probabilité estimée" className="sm:col-span-2">
          <RhfRange control={control} name="estimatedProbability" />
        </FormField>
      </FormSection>

      <FormSection title="Prochaine action">
        <FormField label="Action à mener">
          <Input {...register("nextAction")} placeholder="Relancer, préparer l'entretien..." />
        </FormField>
        <FormField label="Date">
          <Input type="date" {...register("nextActionDate")} />
        </FormField>
      </FormSection>

      <FormField label="Notes">
        <Textarea rows={4} {...register("notes")} />
      </FormField>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : application ? "Enregistrer" : "Créer la candidature"}
        </Button>
      </div>
    </form>
  );
}
