"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toggleTaskDone, deleteTask } from "@/lib/actions/tasks";
import { TASK_PRIORITY_LEVELS, labelFor, colorFor } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/lib/data/tasks";

export function TaskRow({ task }: { task: TaskWithRelations }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
      <Checkbox
        checked={task.status === "DONE"}
        disabled={pending}
        onCheckedChange={() => startTransition(async () => { await toggleTaskDone(task.id); })}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", task.status === "DONE" ? "text-muted-foreground line-through" : "text-foreground")}>
          {task.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {task.category && `${task.category} · `}
          {task.application && (
            <Link href={`/applications/${task.application.id}`} className="hover:underline">
              {task.application.company.name}
            </Link>
          )}
          {task.contact && (
            <Link href={`/contacts/${task.contact.id}`} className="hover:underline">
              {task.contact.firstName} {task.contact.lastName}
            </Link>
          )}
        </p>
      </div>
      {task.dueDate && <span className="shrink-0 text-xs text-muted-foreground">{formatDate(task.dueDate)}</span>}
      <Badge dotColor={colorFor(TASK_PRIORITY_LEVELS, task.priority)}>{labelFor(TASK_PRIORITY_LEVELS, task.priority)}</Badge>
      <button className="shrink-0 text-muted-foreground hover:text-danger" onClick={() => startTransition(async () => { await deleteTask(task.id); })}>
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
