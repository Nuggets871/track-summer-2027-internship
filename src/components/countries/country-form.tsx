"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/forms/form-field";
import { RhfRange } from "@/components/forms/rhf-checkbox";
import { createCountry, updateCountry, type CountryInput } from "@/lib/actions/countries";
import type { Country } from "@prisma/client";

type FormValues = {
  name: string;
  code: string;
  region: string;
  personalPreference: number;
  visaNotes: string;
  costOfLivingNotes: string;
  averageSalaryNote: string;
};

export function CountryForm({ country, onSuccess }: { country?: Country | null; onSuccess?: () => void }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: country
      ? {
          name: country.name,
          code: country.code ?? "",
          region: country.region ?? "",
          personalPreference: country.personalPreference,
          visaNotes: country.visaNotes ?? "",
          costOfLivingNotes: country.costOfLivingNotes ?? "",
          averageSalaryNote: country.averageSalaryNote ?? "",
        }
      : { personalPreference: 3 },
  });

  const onSubmit = (values: FormValues) => {
    const payload: CountryInput = { ...values, usefulLinks: null };
    startTransition(async () => {
      try {
        if (country) await updateCountry(country.id, payload);
        else await createCountry(payload);
        toast.success("Pays enregistré");
        onSuccess?.();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FormSection title="Identité">
        <FormField label="Nom" required>
          <Input {...register("name", { required: true })} />
        </FormField>
        <FormField label="Code ISO">
          <Input {...register("code")} placeholder="GB, US, SG..." />
        </FormField>
        <FormField label="Région">
          <Input {...register("region")} />
        </FormField>
        <FormField label="Préférence personnelle (1-5)">
          <RhfRange control={control} name="personalPreference" min={1} max={5} step={1} />
        </FormField>
      </FormSection>
      <FormField label="Notes visa (perso, pas un conseil juridique)" hint="À vérifier auprès des autorités compétentes.">
        <Textarea rows={2} {...register("visaNotes")} />
      </FormField>
      <FormField label="Coût de la vie">
        <Textarea rows={2} {...register("costOfLivingNotes")} />
      </FormField>
      <FormField label="Salaires observés">
        <Textarea rows={2} {...register("averageSalaryNote")} />
      </FormField>
      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {country ? "Enregistrer" : "Ajouter le pays"}
        </Button>
      </div>
    </form>
  );
}
