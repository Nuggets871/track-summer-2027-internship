"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Video, Phone, Building } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { RhfSelect } from "@/components/forms/rhf-select";
import { FormField } from "@/components/forms/form-field";
import { createInterview, deleteInterview, type InterviewInput } from "@/lib/actions/interviews";
import { INTERVIEW_FORMATS, INTERVIEW_STATUSES, labelFor } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { Interview } from "@prisma/client";

const FORMAT_ICON = { VIDEO: Video, PHONE: Phone, ONSITE: Building } as const;

type FormValues = {
  roundLabel: string;
  scheduledAt: string;
  durationMinutes: string;
  format: string;
  notes: string;
};

export function InterviewList({ applicationId, companyId, interviews }: { applicationId: string; companyId: string; interviews: Interview[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control, reset } = useForm<FormValues>({ defaultValues: { format: "VIDEO" } });

  const onSubmit = (values: FormValues) => {
    const payload: InterviewInput = {
      applicationId,
      companyId,
      roundLabel: values.roundLabel,
      scheduledAt: values.scheduledAt ? new Date(values.scheduledAt) : null,
      durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : null,
      format: values.format,
      status: "SCHEDULED",
    };
    startTransition(async () => {
      await createInterview(payload);
      toast.success("Entretien planifié");
      reset();
      setOpen(false);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Planifier un entretien
        </Button>
      </div>
      {interviews.length === 0 ? (
        <EmptyState icon={Video} title="Aucun entretien planifié" />
      ) : (
        <div className="flex flex-col gap-2">
          {interviews.map((itv) => {
            const Icon = FORMAT_ICON[itv.format as keyof typeof FORMAT_ICON] ?? Video;
            return (
              <Card key={itv.id} className="flex items-center gap-3 p-3">
                <Icon className="size-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{itv.roundLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {itv.scheduledAt ? formatDateTime(itv.scheduledAt) : "Date à définir"}
                    {itv.durationMinutes && ` · ${itv.durationMinutes} min`}
                  </p>
                </div>
                <Badge variant="outline">{labelFor(INTERVIEW_STATUSES, itv.status)}</Badge>
                <button className="text-muted-foreground hover:text-danger" onClick={() => startTransition(async () => { await deleteInterview(itv.id); })}>
                  <Trash2 className="size-4" />
                </button>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Planifier un entretien</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
              <FormField label="Libellé" required>
                <Input {...register("roundLabel", { required: true })} placeholder="Entretien RH, manager..." />
              </FormField>
              <FormField label="Date et heure">
                <Input type="datetime-local" {...register("scheduledAt")} />
              </FormField>
              <FormField label="Format">
                <RhfSelect control={control} name="format" options={INTERVIEW_FORMATS.map((f) => ({ value: f.value, label: f.label }))} />
              </FormField>
              <FormField label="Durée (minutes)">
                <Input type="number" {...register("durationMinutes")} />
              </FormField>
              <FormField label="Notes">
                <Textarea rows={2} {...register("notes")} />
              </FormField>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  Planifier
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
