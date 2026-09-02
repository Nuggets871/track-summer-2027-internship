"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const savedViewSchema = z.object({
  name: z.string().min(1),
  entity: z.string().default("APPLICATION"),
  filters: z.record(z.string(), z.any()),
  sort: z.record(z.string(), z.any()).optional().nullable(),
  visibleColumns: z.array(z.string()).optional().nullable(),
});

export async function createSavedView(raw: z.infer<typeof savedViewSchema>) {
  const data = savedViewSchema.parse(raw);
  const view = await prisma.savedView.create({
    data: {
      name: data.name,
      entity: data.entity,
      filters: JSON.stringify(data.filters),
      sort: data.sort ? JSON.stringify(data.sort) : null,
      visibleColumns: data.visibleColumns ? JSON.stringify(data.visibleColumns) : null,
    },
  });
  revalidatePath("/applications");
  return view;
}

export async function deleteSavedView(id: string) {
  await prisma.savedView.delete({ where: { id } });
  revalidatePath("/applications");
}
