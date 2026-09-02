import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * Pipeline stages are required reference data, not demo seed data. Keep this
 * idempotent guard at every entry point that needs them so a fresh database
 * can never create an Application with a missing status foreign key.
 */
export async function ensureApplicationPipelineStages() {
  await prisma.$transaction(
    DEFAULT_PIPELINE_STAGES.map((stage) =>
      prisma.pipelineStage.upsert({
        where: { key: stage.key },
        create: { ...stage, isSystem: true, kind: "APPLICATION" },
        update: {},
      }),
    ),
  );

  return prisma.pipelineStage.findMany({
    where: { kind: "APPLICATION" },
    orderBy: { order: "asc" },
  });
}
