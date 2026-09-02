"use client";

import { useMemo, useState } from "react";
import { Plus, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { TaskForm } from "@/components/forms/task-form";
import { TaskRow } from "@/components/tasks/task-row";
import { daysUntil } from "@/lib/utils";
import type { TaskWithRelations } from "@/lib/data/tasks";
import type { ReferenceData } from "@/lib/data/reference";

function Section({ title, tasks, emptyLabel }: { title: string; tasks: TaskWithRelations[]; emptyLabel: string }) {
  if (tasks.length === 0) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          {title} <span className="text-muted-foreground">(0)</span>
        </h3>
        <p className="text-sm text-subtle-foreground">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        {title} <span className="text-muted-foreground">({tasks.length})</span>
      </h3>
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </div>
    </div>
  );
}

export function TasksBoard({ tasks, reference }: { tasks: TaskWithRelations[]; reference: ReferenceData }) {
  const [createOpen, setCreateOpen] = useState(false);

  const groups = useMemo(() => {
    const overdue: TaskWithRelations[] = [];
    const today: TaskWithRelations[] = [];
    const upcoming: TaskWithRelations[] = [];
    const completed: TaskWithRelations[] = [];

    for (const t of tasks) {
      if (t.status === "DONE") {
        completed.push(t);
        continue;
      }
      const d = t.dueDate ? daysUntil(t.dueDate) : null;
      if (d === null) upcoming.push(t);
      else if (d < 0) overdue.push(t);
      else if (d === 0) today.push(t);
      else upcoming.push(t);
    }
    return { overdue, today, upcoming, completed };
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <>
        <EmptyState
          icon={ListChecks}
          title="Aucune tâche"
          description="Créez votre première tâche pour commencer à organiser votre recherche."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus /> Nouvelle tâche
            </Button>
          }
        />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent size="lg">
            <DialogHeader>
              <DialogTitle>Nouvelle tâche</DialogTitle>
            </DialogHeader>
            <DialogBody className="pb-5">
              <TaskForm reference={reference} onSuccess={() => setCreateOpen(false)} />
            </DialogBody>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus /> Nouvelle tâche
        </Button>
      </div>
      <Section title="En retard" tasks={groups.overdue} emptyLabel="Rien en retard, bravo." />
      <Section title="Aujourd'hui" tasks={groups.today} emptyLabel="Rien de prévu aujourd'hui." />
      <Section title="À venir" tasks={groups.upcoming} emptyLabel="Aucune tâche à venir." />
      <Section title="Terminées" tasks={groups.completed} emptyLabel="Aucune tâche terminée." />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <TaskForm reference={reference} onSuccess={() => setCreateOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
