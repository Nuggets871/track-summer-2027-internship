import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const taskListInclude = {
  application: { include: { company: true } },
  company: true,
  contact: true,
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskListInclude }>;

export async function getAllTasks(): Promise<TaskWithRelations[]> {
  return prisma.task.findMany({ include: taskListInclude, orderBy: [{ status: "asc" }, { dueDate: "asc" }] });
}
