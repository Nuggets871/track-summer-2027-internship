"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().default("#6366f1"),
});

export async function createTag(raw: z.infer<typeof tagSchema>) {
  const data = tagSchema.parse(raw);
  const tag = await prisma.tag.upsert({
    where: { name: data.name },
    create: data,
    update: {},
  });
  revalidatePath("/", "layout");
  return tag;
}

export async function deleteTag(id: string) {
  await prisma.tag.delete({ where: { id } });
  revalidatePath("/", "layout");
}

export async function listTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } });
}
