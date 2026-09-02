"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField, FormSection } from "@/components/forms/form-field";
import { RhfSelect } from "@/components/forms/rhf-select";
import { createTask, updateTask, type TaskInput } from "@/lib/actions/tasks";
import { TASK_PRIORITY_LEVELS, TASK_RECURRENCES } from "@/lib/constants";
import type { ReferenceData } from "@/lib/data/reference";
import type { Task } from "@prisma/client";

type FormValues = {
  title: string;
  description: string;
  category: string;
  applicationId: string;
  companyId: string;
  contactId: string;
  priority: string;
  dueDate: string;
  recurrence: string;
};

function toDateInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function TaskForm({
  reference,
  task,
  defaultApplicationId,
  defaultContactId,
  onSuccess,
}: {
  reference: ReferenceData;
  task?: Task | null;
  defaultApplicationId?: string;
  defaultContactId?: string;
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: task
      ? {
          title: task.title,
          description: task.description ?? "",
          category: task.category ?? "",
          applicationId: task.applicationId ?? "",
          companyId: task.companyId ?? "",
          contactId: task.contactId ?? "",
          priority: task.priority,
          dueDate: toDateInput(task.dueDate),
          recurrence: task.recurrence ?? "NONE",
        }
      : {
          priority: "MEDIUM",
          recurrence: "NONE",
          applicationId: defaultApplicationId ?? "",
          contactId: defaultContactId ?? "",
        },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      applicationId: values.applicationId || null,
      companyId: values.companyId || null,
      contactId: values.contactId || null,
      dueDate: values.dueDate ? new Date(values.dueDate) : null,
    } as unknown as TaskInput;

    startTransition(async () => {
      try {
        if (task) {
          await updateTask(task.id, payload);
          toast.success("Tâche mise à jour");
        } else {
          await createTask(payload);
          toast.success("Tâche créée");
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
        <Input {...register("title", { required: true })} placeholder="Relancer..." />
      </FormField>
      <FormField label="Description">
        <Textarea rows={2} {...register("description")} />
      </FormField>
      <FormSection title="Détails">
        <FormField label="Priorité">
          <RhfSelect control={control} name="priority" options={TASK_PRIORITY_LEVELS.map((p) => ({ value: p.value, label: p.label }))} />
        </FormField>
        <FormField label="Échéance">
          <Input type="date" {...register("dueDate")} />
        </FormField>
        <FormField label="Catégorie">
          <Input {...register("category")} placeholder="Networking, prépa entretien..." />
        </FormField>
        <FormField label="Récurrence">
          <RhfSelect control={control} name="recurrence" options={TASK_RECURRENCES.map((r) => ({ value: r.value, label: r.label }))} />
        </FormField>
      </FormSection>
      <FormSection title="Lier à">
        <FormField label="Candidature">
          <RhfSelect
            control={control}
            name="applicationId"
            options={reference.applications.map((a) => ({ value: a.id, label: a.name }))}
            allowEmpty
            placeholder="Aucune"
          />
        </FormField>
        <FormField label="Contact">
          <RhfSelect control={control} name="contactId" options={reference.contacts.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Aucun" />
        </FormField>
      </FormSection>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : task ? "Enregistrer" : "Créer la tâche"}
        </Button>
      </div>
    </form>
  );
}
