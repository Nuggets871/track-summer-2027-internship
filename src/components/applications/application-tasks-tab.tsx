"use client";

import { useState, useTransition } from "react";
import { Plus, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { TaskForm } from "@/components/forms/task-form";
import { toggleTaskDone } from "@/lib/actions/tasks";
import { TASK_PRIORITY_LEVELS, labelFor, colorFor } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import type { Task } from "@prisma/client";
import type { ReferenceData } from "@/lib/data/reference";

export function ApplicationTasksTab({ applicationId, tasks, reference }: { applicationId: string; tasks: Task[]; reference: ReferenceData }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Nouvelle tâche
        </Button>
      </div>
      {tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="Aucune tâche liée" />
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-md border border-border p-3">
              <Checkbox checked={t.status === "DONE"} onCheckedChange={() => startTransition(async () => { await toggleTaskDone(t.id); })} />
              <div className="flex-1">
                <p className={cn("text-sm", t.status === "DONE" ? "text-muted-foreground line-through" : "text-foreground")}>{t.title}</p>
                {t.dueDate && <p className="text-xs text-muted-foreground">{formatDate(t.dueDate)}</p>}
              </div>
              <Badge dotColor={colorFor(TASK_PRIORITY_LEVELS, t.priority)}>{labelFor(TASK_PRIORITY_LEVELS, t.priority)}</Badge>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <TaskForm reference={reference} defaultApplicationId={applicationId} onSuccess={() => setOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
