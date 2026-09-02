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
import { RhfRange } from "@/components/forms/rhf-checkbox";
import { createCompany, updateCompany, type CompanyInput } from "@/lib/actions/companies";
import { COMPANY_SIZES, COMPANY_TYPES, WISHLIST_CATEGORIES } from "@/lib/constants";
import type { ReferenceData } from "@/lib/data/reference";
import type { Company } from "@prisma/client";

type FormValues = {
  name: string;
  logoUrl: string;
  website: string;
  linkedin: string;
  countryId: string;
  citiesText: string;
  sector: string;
  type: string;
  size: string;
  description: string;
  personalNote: string;
  interestLevel: number;
  wishlistCategory: string;
  wishlistProgress: number;
};

function defaultsFrom(company?: Company | null): Partial<FormValues> {
  if (!company) return { interestLevel: 3, wishlistProgress: 0 };
  return {
    name: company.name,
    logoUrl: company.logoUrl ?? "",
    website: company.website ?? "",
    linkedin: company.linkedin ?? "",
    countryId: company.countryId ?? "",
    citiesText: company.citiesText ?? "",
    sector: company.sector ?? "",
    type: company.type ?? "",
    size: company.size ?? "",
    description: company.description ?? "",
    personalNote: company.personalNote ?? "",
    interestLevel: company.interestLevel,
    wishlistCategory: company.wishlistCategory ?? "",
    wishlistProgress: company.wishlistProgress,
  };
}

export function CompanyForm({
  reference,
  company,
  onSuccess,
}: {
  reference: ReferenceData;
  company?: Company | null;
  onSuccess?: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>({ defaultValues: defaultsFrom(company) });

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      countryId: values.countryId || null,
      wishlistCategory: values.wishlistCategory || null,
    } as unknown as CompanyInput;

    startTransition(async () => {
      try {
        if (company) {
          await updateCompany(company.id, payload);
          toast.success("Entreprise mise à jour");
          onSuccess?.(company.id);
        } else {
          const created = await createCompany(payload);
          toast.success("Entreprise ajoutée");
          onSuccess?.(created.id);
          if (!onSuccess) router.push(`/companies/${created.id}`);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <FormSection title="Identité">
        <FormField label="Nom" required className="sm:col-span-2">
          <Input {...register("name", { required: true })} placeholder="Nom de l'entreprise" />
        </FormField>
        <FormField label="Site web">
          <Input {...register("website")} placeholder="https://..." />
        </FormField>
        <FormField label="LinkedIn">
          <Input {...register("linkedin")} placeholder="https://linkedin.com/company/..." />
        </FormField>
        <FormField label="Logo (URL)">
          <Input {...register("logoUrl")} placeholder="https://..." />
        </FormField>
      </FormSection>

      <FormSection title="Profil">
        <FormField label="Pays">
          <RhfSelect control={control} name="countryId" options={reference.countries.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Choisir..." />
        </FormField>
        <FormField label="Villes (texte libre)">
          <Input {...register("citiesText")} placeholder="Londres, Manchester..." />
        </FormField>
        <FormField label="Secteur">
          <Input {...register("sector")} />
        </FormField>
        <FormField label="Type">
          <RhfSelect control={control} name="type" options={COMPANY_TYPES.map((t) => ({ value: t, label: t }))} allowEmpty placeholder="Choisir..." />
        </FormField>
        <FormField label="Taille">
          <RhfSelect control={control} name="size" options={COMPANY_SIZES.map((s) => ({ value: s, label: `${s} employés` }))} allowEmpty placeholder="Choisir..." />
        </FormField>
      </FormSection>

      <FormField label="Description">
        <Textarea rows={2} {...register("description")} />
      </FormField>
      <FormField label="Note personnelle">
        <Textarea rows={2} {...register("personalNote")} />
      </FormField>

      <FormSection title="Priorisation">
        <FormField label="Niveau d'intérêt (1-5)" className="sm:col-span-2">
          <RhfRange control={control} name="interestLevel" min={1} max={5} step={1} />
        </FormField>
        <FormField label="Catégorie wishlist">
          <RhfSelect control={control} name="wishlistCategory" options={WISHLIST_CATEGORIES.map((w) => ({ value: w.value, label: w.label }))} allowEmpty placeholder="Aucune" />
        </FormField>
        <FormField label="Progression wishlist (%)">
          <RhfRange control={control} name="wishlistProgress" min={0} max={100} step={5} />
        </FormField>
      </FormSection>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : company ? "Enregistrer" : "Ajouter l'entreprise"}
        </Button>
      </div>
    </form>
  );
}
