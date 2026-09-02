"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { RhfSelect } from "@/components/forms/rhf-select";
import { createNote, type NoteInput } from "@/lib/actions/notes";
import type { ReferenceData } from "@/lib/data/reference";

type FormValues = {
  title: string;
  content: string;
  applicationId: string;
  companyId: string;
  contactId: string;
};

export function NoteForm({
  reference,
  defaultApplicationId,
  defaultCompanyId,
  defaultContactId,
  onSuccess,
}: {
  reference: ReferenceData;
  defaultApplicationId?: string;
  defaultCompanyId?: string;
  defaultContactId?: string;
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: {
      applicationId: defaultApplicationId ?? "",
      companyId: defaultCompanyId ?? "",
      contactId: defaultContactId ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: NoteInput = {
      title: values.title || null,
      content: values.content,
      pinned: false,
      applicationId: values.applicationId || null,
      companyId: values.companyId || null,
      contactId: values.contactId || null,
      countryId: null,
    };
    startTransition(async () => {
      try {
        await createNote(payload);
        toast.success("Note ajoutée");
        onSuccess?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormField label="Titre">
        <Input {...register("title")} placeholder="Optionnel" />
      </FormField>
      <FormField label="Contenu" required>
        <Textarea rows={5} {...register("content", { required: true })} />
      </FormField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField label="Candidature">
          <RhfSelect control={control} name="applicationId" options={reference.applications.map((a) => ({ value: a.id, label: a.name }))} allowEmpty placeholder="Aucune" />
        </FormField>
        <FormField label="Entreprise">
          <RhfSelect control={control} name="companyId" options={reference.companies.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Aucune" />
        </FormField>
        <FormField label="Contact">
          <RhfSelect control={control} name="contactId" options={reference.contacts.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Aucun" />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Ajouter la note"}
        </Button>
      </div>
    </form>
  );
}
