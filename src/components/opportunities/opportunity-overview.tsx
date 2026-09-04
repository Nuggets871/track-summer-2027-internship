"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Application, Company, Country, City } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateApplication } from "@/lib/actions/applications";

type ApplicationDetail = Application & { company: Company; country: Country | null; city: City | null };

function toDateInput(d: Date | null) {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export function OpportunityOverview({ application }: { application: ApplicationDetail }) {
  const [pending, startTransition] = useTransition();
  const [fields, setFields] = useState({
    title: application.title,
    companyName: application.company.name,
    countryName: application.country?.name ?? "",
    city: application.city?.name ?? "",
    remotePossible: application.remotePossible,
    jobUrl: application.jobUrl ?? "",
    source: application.source ?? "",
    salaryAmount: application.salaryAmount?.toString() ?? "",
    salaryCurrency: application.salaryCurrency ?? "EUR",
    durationMonths: application.durationMonths?.toString() ?? "",
    potentialStartDate: toDateInput(application.potentialStartDate),
    deadline: toDateInput(application.deadline),
  });

  const update = <K extends keyof typeof fields>(key: K, value: (typeof fields)[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    startTransition(async () => {
      await updateApplication(application.id, {
        title: fields.title,
        companyName: fields.companyName,
        countryName: fields.countryName || null,
        city: fields.city || null,
        remotePossible: fields.remotePossible,
        jobUrl: fields.jobUrl || null,
        source: fields.source || null,
        salaryAmount: fields.salaryAmount ? Number(fields.salaryAmount) : null,
        salaryCurrency: fields.salaryCurrency,
        durationMonths: fields.durationMonths ? Number(fields.durationMonths) : null,
        potentialStartDate: fields.potentialStartDate ? new Date(fields.potentialStartDate) : null,
        deadline: fields.deadline ? new Date(fields.deadline) : null,
      });
      toast.success("Opportunité mise à jour");
    });
  };

  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
          <div>
            <p className="text-base font-semibold text-foreground">Informations</p>
            <p className="text-sm text-muted-foreground">
              {[application.city?.name, application.country?.name, application.source].filter(Boolean).join(" · ") || "Informations essentielles de l’opportunité"}
            </p>
          </div>
          <span className="text-xs font-medium text-primary group-open:hidden">Modifier</span>
          <span className="hidden text-xs font-medium text-muted-foreground group-open:inline">Fermer</span>
        </summary>
      <CardContent className="grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2">
        <Field label="Poste">
          <Input value={fields.title} onChange={(e) => update("title", e.target.value)} />
        </Field>
        <Field label="Entreprise">
          <Input value={fields.companyName} onChange={(e) => update("companyName", e.target.value)} />
        </Field>
        <Field label="Pays">
          <Input value={fields.countryName} onChange={(e) => update("countryName", e.target.value)} />
        </Field>
        <Field label="Ville">
          <Input value={fields.city} onChange={(e) => update("city", e.target.value)} />
        </Field>
        <Field label="Lien de l'offre">
          <Input value={fields.jobUrl} onChange={(e) => update("jobUrl", e.target.value)} placeholder="https://..." />
        </Field>
        <Field label="Source">
          <Input value={fields.source} onChange={(e) => update("source", e.target.value)} placeholder="LinkedIn, site entreprise..." />
        </Field>
        <Field label="Rémunération">
          <div className="flex gap-2">
            <Input type="number" value={fields.salaryAmount} onChange={(e) => update("salaryAmount", e.target.value)} className="flex-1" />
            <Select value={fields.salaryCurrency} onValueChange={(v) => update("salaryCurrency", v)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["EUR", "USD", "GBP", "CHF"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Field>
        <Field label="Durée (mois)">
          <Input type="number" value={fields.durationMonths} onChange={(e) => update("durationMonths", e.target.value)} />
        </Field>
        <Field label="Début souhaité">
          <Input type="date" value={fields.potentialStartDate} onChange={(e) => update("potentialStartDate", e.target.value)} />
        </Field>
        <Field label="Deadline de candidature">
          <Input type="date" value={fields.deadline} onChange={(e) => update("deadline", e.target.value)} />
        </Field>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Switch checked={fields.remotePossible} onCheckedChange={(v) => update("remotePossible", v)} />
          <span className="text-sm text-foreground">Télétravail possible</span>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button onClick={save} disabled={pending}>
            Enregistrer
          </Button>
        </div>
      </CardContent>
      </details>
    </Card>
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
