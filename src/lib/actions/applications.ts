"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logInteraction } from "@/lib/data/timeline";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const applicationSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  companyId: z.string().min(1, "L'entreprise est requise"),
  countryId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  cityId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  remotePossible: z.boolean().default(false),
  sector: z.preprocess(emptyToNull, z.string().nullable().optional()),
  department: z.preprocess(emptyToNull, z.string().nullable().optional()),
  jobUrl: z.preprocess(emptyToNull, z.string().url("URL invalide").nullable().optional()),
  source: z.preprocess(emptyToNull, z.string().nullable().optional()),
  primaryContactId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  discoveredAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  appliedAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  deadline: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  potentialStartDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  durationMonths: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  salaryAmount: z.preprocess(emptyToNull, z.coerce.number().nullable().optional()),
  salaryCurrency: z.string().default("EUR"),
  housingProvided: z.boolean().nullable().optional(),
  visaRequired: z.boolean().nullable().optional(),
  sponsorshipPossible: z.boolean().nullable().optional(),
  languageRequired: z.preprocess(emptyToNull, z.string().nullable().optional()),
  priority: z.string().default("MEDIUM"),
  interestScore: z.coerce.number().int().min(0).max(100).default(50),
  estimatedProbability: z.coerce.number().int().min(0).max(100).default(50),
  statusId: z.string().min(1, "Le statut est requis"),
  nextAction: z.preprocess(emptyToNull, z.string().nullable().optional()),
  nextActionDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

function revalidateApplicationPaths(id?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/applications");
  revalidatePath("/kanban");
  revalidatePath("/today");
  revalidatePath("/analytics");
  revalidatePath("/wishlist");
  if (id) revalidatePath(`/applications/${id}`);
}

export async function createApplication(raw: ApplicationInput) {
  const data = applicationSchema.parse(raw);

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        ...data,
        discoveredAt: data.discoveredAt ?? new Date(),
      },
      include: { company: true },
    });
    await logInteraction(
      {
        type: "NOTE",
        summary: `Candidature créée : ${created.title}`,
        applicationId: created.id,
        companyId: created.companyId,
      },
      tx,
    );
    return created;
  });

  revalidateApplicationPaths(application.id);
  return application;
}

export async function updateApplication(id: string, raw: Partial<ApplicationInput>) {
  const schema = applicationSchema.partial();
  const data = schema.parse(raw);

  const existing = await prisma.application.findUniqueOrThrow({ where: { id } });

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.application.update({ where: { id }, data });

    if (data.statusId && data.statusId !== existing.statusId) {
      const [oldStage, newStage] = await Promise.all([
        tx.pipelineStage.findUnique({ where: { id: existing.statusId } }),
        tx.pipelineStage.findUnique({ where: { id: data.statusId } }),
      ]);
      await logInteraction(
        {
          type: "STATUS_CHANGE",
          summary: `Statut changé : ${oldStage?.label ?? "?"} → ${newStage?.label ?? "?"}`,
          applicationId: id,
          companyId: result.companyId,
        },
        tx,
      );
      if (newStage?.key === "FOLLOW_UP") {
        await tx.application.update({ where: { id }, data: { followUpCount: { increment: 1 } } });
      }
    }

    return result;
  });

  revalidateApplicationPaths(id);
  return updated;
}

export async function updateApplicationStatus(id: string, statusId: string) {
  return updateApplication(id, { statusId });
}

export async function deleteApplication(id: string) {
  await prisma.application.delete({ where: { id } });
  revalidateApplicationPaths();
}

export async function bulkDeleteApplications(ids: string[]) {
  await prisma.application.deleteMany({ where: { id: { in: ids } } });
  revalidateApplicationPaths();
}

export async function bulkUpdateApplicationStatus(ids: string[], statusId: string) {
  await prisma.application.updateMany({ where: { id: { in: ids } }, data: { statusId } });
  revalidateApplicationPaths();
}

export async function bulkTagApplications(ids: string[], tagId: string) {
  await Promise.all(
    ids.map((id) =>
      prisma.application.update({ where: { id }, data: { tags: { connect: { id: tagId } } } }),
    ),
  );
  revalidateApplicationPaths();
}

export async function duplicateApplication(id: string) {
  const original = await prisma.application.findUniqueOrThrow({ where: { id } });
  const stages = await prisma.pipelineStage.findMany({ where: { kind: "APPLICATION" }, orderBy: { order: "asc" } });
  const firstStage = stages[0];

  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = original;
  void _id;
  void _createdAt;
  void _updatedAt;

  const copy = await prisma.application.create({
    data: {
      ...rest,
      title: `${original.title} (copie)`,
      statusId: firstStage?.id ?? original.statusId,
      appliedAt: null,
      followUpCount: 0,
    },
  });
  revalidateApplicationPaths();
  return copy;
}

export async function recordFollowUp(id: string, note?: string) {
  const app = await prisma.application.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction(async (tx) => {
    await tx.application.update({
      where: { id },
      data: { followUpCount: { increment: 1 } },
    });
    await logInteraction(
      {
        type: "EMAIL",
        summary: note ? `Relance envoyée — ${note}` : "Relance envoyée",
        applicationId: id,
        companyId: app.companyId,
      },
      tx,
    );
  });
  revalidateApplicationPaths(id);
}

export async function logApplicationInteraction(
  id: string,
  input: { type: string; summary: string; details?: string },
) {
  const app = await prisma.application.findUniqueOrThrow({ where: { id } });
  await logInteraction({ type: input.type, summary: input.summary, details: input.details, applicationId: id, companyId: app.companyId });
  revalidateApplicationPaths(id);
}

export async function addApplicationNote(id: string, content: string) {
  const app = await prisma.application.findUniqueOrThrow({ where: { id } });
  await prisma.note.create({ data: { content, applicationId: id, companyId: app.companyId } });
  revalidateApplicationPaths(id);
}
