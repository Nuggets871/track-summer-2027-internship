"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const checklistSchema = z
  .array(z.object({ id: z.string().min(1), label: z.string().trim().min(1).max(200), done: z.boolean() }))
  .max(100);

export async function saveInterviewChecklist(applicationId: string, items: unknown) {
  const parsed = checklistSchema.parse(items);
  await prisma.application.update({
    where: { id: applicationId },
    data: { interviewChecklist: JSON.stringify(parsed) },
  });
  revalidatePath(`/opportunities/${applicationId}`);
  return parsed;
}
