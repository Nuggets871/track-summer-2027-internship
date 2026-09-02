"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RhfSelect } from "@/components/forms/rhf-select";
import { FormField } from "@/components/forms/form-field";
import { upsertCoverLetter, type CoverLetterInput } from "@/lib/actions/cover-letters";
import { COVER_LETTER_STATUSES } from "@/lib/constants";
import type { CoverLetter } from "@prisma/client";

type FormValues = {
  status: string;
  version: string;
  personalizedElements: string;
  notes: string;
};

export function CoverLetterQuickCard({ applicationId, companyId, coverLetter }: { applicationId: string; companyId: string; coverLetter: CoverLetter | null }) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: coverLetter
      ? { status: coverLetter.status, version: coverLetter.version, personalizedElements: coverLetter.personalizedElements ?? "", notes: coverLetter.notes ?? "" }
      : { status: "DRAFT", version: "v1" },
  });

  const onSubmit = (values: FormValues) => {
    const payload: CoverLetterInput = { applicationId, companyId, ...values };
    startTransition(async () => {
      await upsertCoverLetter(payload);
      toast.success("Lettre de motivation enregistrée");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lettre de motivation</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Statut">
              <RhfSelect control={control} name="status" options={COVER_LETTER_STATUSES.map((s) => ({ value: s.value, label: s.label }))} />
            </FormField>
            <FormField label="Version">
              <Input {...register("version")} />
            </FormField>
          </div>
          <FormField label="Éléments personnalisés">
            <Textarea rows={2} {...register("personalizedElements")} />
          </FormField>
          <FormField label="Notes">
            <Textarea rows={2} {...register("notes")} />
          </FormField>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={pending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
