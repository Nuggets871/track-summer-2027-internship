"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const pipelineStageSchema = z.object({
  label: z.string().min(1, "Le libellé est requis"),
  color: z.string().default("#6366f1"),
  kind: z.string().default("APPLICATION"),
});

function revalidatePipelinePaths() {
  revalidatePath("/", "layout");
  revalidatePath("/applications");
  revalidatePath("/kanban");
  revalidatePath("/settings");
}

export async function createPipelineStage(raw: z.infer<typeof pipelineStageSchema>) {
  const data = pipelineStageSchema.parse(raw);
  const maxOrder = await prisma.pipelineStage.aggregate({
    where: { kind: data.kind },
    _max: { order: true },
  });
  const stage = await prisma.pipelineStage.create({
    data: {
      ...data,
      key: `${slugify(data.label).toUpperCase().replace(/-/g, "_")}_${Date.now().toString(36)}`,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
  revalidatePipelinePaths();
  return stage;
}

export async function updatePipelineStage(id: string, raw: Partial<z.infer<typeof pipelineStageSchema>>) {
  const data = pipelineStageSchema.partial().parse(raw);
  const stage = await prisma.pipelineStage.update({ where: { id }, data });
  revalidatePipelinePaths();
  return stage;
}

export async function reorderPipelineStages(orderedIds: string[]) {
  await prisma.$transaction(orderedIds.map((id, index) => prisma.pipelineStage.update({ where: { id }, data: { order: index } })));
  revalidatePipelinePaths();
}

export async function deletePipelineStage(id: string, fallbackStatusId: string) {
  const stage = await prisma.pipelineStage.findUniqueOrThrow({ where: { id } });
  if (stage.isSystem) throw new Error("Ce statut par défaut ne peut pas être supprimé.");
  await prisma.$transaction([
    prisma.application.updateMany({ where: { statusId: id }, data: { statusId: fallbackStatusId } }),
    prisma.pipelineStage.delete({ where: { id } }),
  ]);
  revalidatePipelinePaths();
}
