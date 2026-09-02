"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const researchItemSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  url: z.preprocess(emptyToNull, z.string().nullable().optional()),
  category: z.string().default("OTHER"),
  summary: z.preprocess(emptyToNull, z.string().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  interestLevel: z.coerce.number().int().min(1).max(5).default(3),
  countryId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  companyId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  applicationId: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type ResearchItemInput = z.infer<typeof researchItemSchema>;

function revalidateResearchPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/research");
}

export async function createResearchItem(raw: z.infer<typeof researchItemSchema>) {
  const data = researchItemSchema.parse(raw);
  const item = await prisma.researchItem.create({ data });
  revalidateResearchPaths();
  return item;
}

export async function updateResearchItem(id: string, raw: Partial<z.infer<typeof researchItemSchema>>) {
  const data = researchItemSchema.partial().parse(raw);
  const item = await prisma.researchItem.update({ where: { id }, data });
  revalidateResearchPaths();
  return item;
}

export async function deleteResearchItem(id: string) {
  await prisma.researchItem.delete({ where: { id } });
  revalidateResearchPaths();
}

export async function setResearchItemTags(id: string, tagIds: string[]) {
  await prisma.researchItem.update({ where: { id }, data: { tags: { set: tagIds.map((tagId) => ({ id: tagId })) } } });
  revalidateResearchPaths();
}
