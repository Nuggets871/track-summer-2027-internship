"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/forms/form-field";
import { RhfSelect } from "@/components/forms/rhf-select";
import { RhfCheckbox } from "@/components/forms/rhf-checkbox";
import { createEvent, updateEvent, type EventInput } from "@/lib/actions/events";
import { EVENT_TYPES } from "@/lib/constants";
import type { ReferenceData } from "@/lib/data/reference";
import type { Event } from "@prisma/client";

type FormValues = {
  title: string;
  type: string;
  date: string;
  allDay: boolean;
  location: string;
  notes: string;
  applicationId: string;
  contactId: string;
  companyId: string;
};

function toDateTimeInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EventForm({
  reference,
  event,
  defaultDate,
  onSuccess,
}: {
  reference: ReferenceData;
  event?: Event | null;
  defaultDate?: Date;
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: event
      ? {
          title: event.title,
          type: event.type,
          date: toDateTimeInput(event.date),
          allDay: event.allDay,
          location: event.location ?? "",
          notes: event.notes ?? "",
          applicationId: event.applicationId ?? "",
          contactId: event.contactId ?? "",
          companyId: event.companyId ?? "",
        }
      : { type: "OTHER", allDay: false, date: toDateTimeInput(defaultDate ?? new Date()) },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      date: new Date(values.date),
      location: values.location || null,
      notes: values.notes || null,
      applicationId: values.applicationId || null,
      contactId: values.contactId || null,
      companyId: values.companyId || null,
    } as unknown as EventInput;

    startTransition(async () => {
      try {
        if (event) {
          await updateEvent(event.id, payload);
          toast.success("Événement mis à jour");
        } else {
          await createEvent(payload);
          toast.success("Événement ajouté au calendrier");
        }
        onSuccess?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <FormField label="Titre" required>
        <Input {...register("title", { required: true })} />
      </FormField>
      <FormSection title="Quand">
        <FormField label="Type">
          <RhfSelect control={control} name="type" options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
        </FormField>
        <FormField label="Date et heure">
          <Input type="datetime-local" {...register("date", { required: true })} />
        </FormField>
        <RhfCheckbox control={control} name="allDay" label="Toute la journée" />
      </FormSection>
      <FormSection title="Contexte">
        <FormField label="Lieu">
          <Input {...register("location")} />
        </FormField>
        <FormField label="Candidature liée">
          <RhfSelect control={control} name="applicationId" options={reference.applications.map((a) => ({ value: a.id, label: a.name }))} allowEmpty placeholder="Aucune" />
        </FormField>
        <FormField label="Contact lié">
          <RhfSelect control={control} name="contactId" options={reference.contacts.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Aucun" />
        </FormField>
        <FormField label="Entreprise liée">
          <RhfSelect control={control} name="companyId" options={reference.companies.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Aucune" />
        </FormField>
      </FormSection>
      <FormField label="Notes">
        <Textarea rows={2} {...register("notes")} />
      </FormField>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : event ? "Enregistrer" : "Ajouter au calendrier"}
        </Button>
      </div>
    </form>
  );
}
