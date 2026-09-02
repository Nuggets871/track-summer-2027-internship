"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RhfSelect } from "@/components/forms/rhf-select";
import { RhfCheckbox, RhfRange } from "@/components/forms/rhf-checkbox";
import { FormField } from "@/components/forms/form-field";
import { upsertOffer, type OfferInput } from "@/lib/actions/offers";
import { OFFER_STATUSES } from "@/lib/constants";
import type { Offer } from "@prisma/client";

type FormValues = {
  role: string;
  city: string;
  salaryAmount: string;
  currency: string;
  bonus: string;
  housing: boolean;
  visaSupport: boolean;
  durationMonths: string;
  prestige: number;
  interest: number;
  learning: number;
  network: number;
  careerPotential: number;
  costOfLivingIndex: number;
  status: string;
};

export function OfferQuickCard({ applicationId, companyId, offer }: { applicationId: string; companyId: string; offer: Offer | null }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: offer
      ? {
          role: offer.role ?? "",
          city: offer.city ?? "",
          salaryAmount: offer.salaryAmount?.toString() ?? "",
          currency: offer.currency,
          bonus: offer.bonus?.toString() ?? "",
          housing: offer.housing,
          visaSupport: offer.visaSupport,
          durationMonths: offer.durationMonths?.toString() ?? "",
          prestige: offer.prestige,
          interest: offer.interest,
          learning: offer.learning,
          network: offer.network,
          careerPotential: offer.careerPotential,
          costOfLivingIndex: offer.costOfLivingIndex,
          status: offer.status,
        }
      : { currency: "EUR", prestige: 3, interest: 3, learning: 3, network: 3, careerPotential: 3, costOfLivingIndex: 50, status: "PENDING" },
  });

  const onSubmit = (values: FormValues) => {
    const payload: OfferInput = {
      applicationId,
      companyId,
      role: values.role || null,
      city: values.city || null,
      salaryAmount: values.salaryAmount ? Number(values.salaryAmount) : null,
      currency: values.currency,
      bonus: values.bonus ? Number(values.bonus) : null,
      housing: values.housing,
      visaSupport: values.visaSupport,
      durationMonths: values.durationMonths ? Number(values.durationMonths) : null,
      prestige: values.prestige,
      interest: values.interest,
      learning: values.learning,
      network: values.network,
      careerPotential: values.careerPotential,
      costOfLivingIndex: values.costOfLivingIndex,
      status: values.status,
    };
    startTransition(async () => {
      await upsertOffer(payload);
      toast.success("Offre enregistrée");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offre reçue</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Salaire">
              <Input type="number" {...register("salaryAmount")} />
            </FormField>
            <FormField label="Devise">
              <Input {...register("currency")} />
            </FormField>
            <FormField label="Statut">
              <RhfSelect control={control} name="status" options={OFFER_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
            </FormField>
            <div className="flex flex-col justify-end gap-2 pb-1.5">
              <RhfCheckbox control={control} name="housing" label="Logement fourni" />
              <RhfCheckbox control={control} name="visaSupport" label="Support visa" />
            </div>
          </div>
          <FormField label="Prestige (1-5)">
            <RhfRange control={control} name="prestige" min={1} max={5} step={1} />
          </FormField>
          <FormField label="Potentiel carrière (1-5)">
            <RhfRange control={control} name="careerPotential" min={1} max={5} step={1} />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              Enregistrer l&apos;offre
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
