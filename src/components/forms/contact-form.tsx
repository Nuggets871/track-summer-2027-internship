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
import { createContact, updateContact, type ContactInput } from "@/lib/actions/contacts";
import { CONTACT_TYPES, NETWORKING_STAGES } from "@/lib/constants";
import type { ReferenceData } from "@/lib/data/reference";
import type { Contact } from "@prisma/client";

type FormValues = {
  firstName: string;
  lastName: string;
  companyId: string;
  position: string;
  email: string;
  phone: string;
  linkedin: string;
  countryId: string;
  city: string;
  contactType: string;
  relationshipStrength: number;
  firstContactDate: string;
  nextFollowUpDate: string;
  networkingStage: string;
  linkedinRequestSent: boolean;
  linkedinAccepted: boolean;
  referralObtained: boolean;
  notes: string;
};

function toDateInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function defaultsFrom(contact?: Contact | null): Partial<FormValues> {
  if (!contact) return { contactType: "OTHER", relationshipStrength: 2 };
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    companyId: contact.companyId ?? "",
    position: contact.position ?? "",
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    linkedin: contact.linkedin ?? "",
    countryId: contact.countryId ?? "",
    city: contact.city ?? "",
    contactType: contact.contactType,
    relationshipStrength: contact.relationshipStrength,
    firstContactDate: toDateInput(contact.firstContactDate),
    nextFollowUpDate: toDateInput(contact.nextFollowUpDate),
    networkingStage: contact.networkingStage ?? "",
    linkedinRequestSent: contact.linkedinRequestSent,
    linkedinAccepted: contact.linkedinAccepted,
    referralObtained: contact.referralObtained,
    notes: contact.notes ?? "",
  };
}

export function ContactForm({
  reference,
  contact,
  defaultCompanyId,
  onSuccess,
}: {
  reference: ReferenceData;
  contact?: Contact | null;
  defaultCompanyId?: string;
  onSuccess?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: { ...defaultsFrom(contact), companyId: contact?.companyId ?? defaultCompanyId ?? "" },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      companyId: values.companyId || null,
      countryId: values.countryId || null,
      networkingStage: values.networkingStage || null,
      firstContactDate: values.firstContactDate ? new Date(values.firstContactDate) : null,
      nextFollowUpDate: values.nextFollowUpDate ? new Date(values.nextFollowUpDate) : null,
    } as unknown as ContactInput;

    startTransition(async () => {
      try {
        if (contact) {
          await updateContact(contact.id, payload);
          toast.success("Contact mis à jour");
          onSuccess?.(contact.id);
        } else {
          const created = await createContact(payload);
          toast.success("Contact ajouté");
          onSuccess?.(created.id);
          if (!onSuccess) router.push(`/contacts/${created.id}`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FormSection title="Identité">
        <FormField label="Prénom" required>
          <Input {...register("firstName", { required: true })} />
        </FormField>
        <FormField label="Nom" required>
          <Input {...register("lastName", { required: true })} />
        </FormField>
        <FormField label="Entreprise">
          <RhfSelect control={control} name="companyId" options={reference.companies.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Choisir..." />
        </FormField>
        <FormField label="Poste">
          <Input {...register("position")} />
        </FormField>
        <FormField label="Type de contact">
          <RhfSelect control={control} name="contactType" options={CONTACT_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
        </FormField>
        <FormField label="Niveau de proximité (1-5)">
          <RhfRange control={control} name="relationshipStrength" min={1} max={5} step={1} />
        </FormField>
      </FormSection>

      <FormSection title="Coordonnées">
        <FormField label="Email">
          <Input type="email" {...register("email")} />
        </FormField>
        <FormField label="Téléphone">
          <Input {...register("phone")} />
        </FormField>
        <FormField label="LinkedIn">
          <Input {...register("linkedin")} />
        </FormField>
        <FormField label="Pays">
          <RhfSelect control={control} name="countryId" options={reference.countries.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Choisir..." />
        </FormField>
        <FormField label="Ville">
          <Input {...register("city")} />
        </FormField>
      </FormSection>

      <FormSection title="Networking">
        <FormField label="Étape du pipeline networking">
          <RhfSelect control={control} name="networkingStage" options={NETWORKING_STAGES.map((s) => ({ value: s.key, label: s.label }))} allowEmpty placeholder="Aucune" />
        </FormField>
        <FormField label="Date du premier contact">
          <Input type="date" {...register("firstContactDate")} />
        </FormField>
        <FormField label="Prochaine relance">
          <Input type="date" {...register("nextFollowUpDate")} />
        </FormField>
        <div className="flex flex-col justify-end gap-2 pb-1.5">
          <RhfCheckbox control={control} name="linkedinRequestSent" label="Demande LinkedIn envoyée" />
          <RhfCheckbox control={control} name="linkedinAccepted" label="Demande acceptée" />
          <RhfCheckbox control={control} name="referralObtained" label="Referral obtenu" />
        </div>
      </FormSection>

      <FormField label="Notes">
        <Textarea rows={3} {...register("notes")} />
      </FormField>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : contact ? "Enregistrer" : "Ajouter le contact"}
        </Button>
      </div>
    </form>
  );
}
