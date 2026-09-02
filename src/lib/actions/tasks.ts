"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const taskSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
  category: z.preprocess(emptyToNull, z.string().nullable().optional()),
  applicationId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  companyId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  contactId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  priority: z.string().default("MEDIUM"),
  dueDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  status: z.string().default("TODO"),
  recurrence: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type TaskInput = z.infer<typeof taskSchema>;

function revalidateTaskPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/tasks");
  revalidatePath("/today");
  revalidatePath("/calendar");
}

export async function createTask(raw: TaskInput) {
  const data = taskSchema.parse(raw);
  const task = await prisma.task.create({ data });
  revalidateTaskPaths();
  return task;
}

export async function updateTask(id: string, raw: Partial<TaskInput>) {
  const data = taskSchema.partial().parse(raw);
  const task = await prisma.task.update({ where: { id }, data });
  revalidateTaskPaths();
  return task;
}

export async function toggleTaskDone(id: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id } });
  const done = task.status !== "DONE";
  const updated = await prisma.task.update({
    where: { id },
    data: { status: done ? "DONE" : "TODO", completedAt: done ? new Date() : null },
  });

  // Recurring tasks spawn their next occurrence on completion.
  if (done && task.recurrence && task.recurrence !== "NONE" && task.dueDate) {
    const next = new Date(task.dueDate);
    if (task.recurrence === "DAILY") next.setDate(next.getDate() + 1);
    if (task.recurrence === "WEEKLY") next.setDate(next.getDate() + 7);
    if (task.recurrence === "MONTHLY") next.setMonth(next.getMonth() + 1);
    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        category: task.category,
        applicationId: task.applicationId,
        companyId: task.companyId,
        contactId: task.contactId,
        priority: task.priority,
        dueDate: next,
        recurrence: task.recurrence,
        status: "TODO",
      },
    });
  }

  revalidateTaskPaths();
  return updated;
}

export async function deleteTask(id: string) {
  await prisma.task.delete({ where: { id } });
  revalidateTaskPaths();
}

export async function bulkCompleteTasks(ids: string[]) {
  await prisma.task.updateMany({ where: { id: { in: ids } }, data: { status: "DONE", completedAt: new Date() } });
  revalidateTaskPaths();
}
