"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureApplicationPipelineStages } from "@/lib/data/pipeline-stages";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const applicationUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  countryName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().nullable().optional()),
  remotePossible: z.boolean().optional(),
  jobUrl: z.preprocess(emptyToNull, z.string().url("URL invalide").nullable().optional()),
  source: z.preprocess(emptyToNull, z.string().nullable().optional()),
  deadline: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  potentialStartDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  durationMonths: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  salaryAmount: z.preprocess(emptyToNull, z.coerce.number().nullable().optional()),
  salaryCurrency: z.preprocess(emptyToNull, z.string().nullable().optional()),
  appliedAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  statusId: z.string().min(1).optional(),
  nextAction: z.preprocess(emptyToNull, z.string().nullable().optional()),
  nextActionDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  interviewPrepNotes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;

function revalidateApplicationPaths(id?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/opportunities");
  if (id) revalidatePath(`/opportunities/${id}`);
}

/**
 * Updates the editable fields of an opportunity from its detail page.
 * `companyName`/`countryName` are plain strings here (not foreign keys) —
 * they upsert the underlying Company/Country rows so the simple UI never
 * has to deal with ids.
 */
export async function updateApplication(id: string, raw: ApplicationUpdateInput) {
  const data = applicationUpdateSchema.parse(raw);
  const { companyName, countryName, city, ...rest } = data;

  await prisma.$transaction(async (tx) => {
    let companyId: string | undefined;
    if (companyName) {
      // Company.name has no unique constraint (deliberately, to allow
      // same-named companies in different contexts) — find-or-create.
      const company =
        (await tx.company.findFirst({ where: { name: companyName } })) ??
        (await tx.company.create({ data: { name: companyName } }));
      companyId = company.id;
    }

    let countryId: string | null | undefined;
    if (countryName !== undefined) {
      if (countryName) {
        const country = await tx.country.upsert({
          where: { name: countryName },
          update: {},
          create: { name: countryName },
        });
        countryId = country.id;
      } else {
        countryId = null;
      }
    }

    let cityId: string | null | undefined;
    if (city !== undefined) {
      const effectiveCountryId = countryId ?? (await tx.application.findUnique({ where: { id }, select: { countryId: true } }))?.countryId;
      if (city && effectiveCountryId) {
        const cityRow = await tx.city.upsert({
          where: { name_countryId: { name: city, countryId: effectiveCountryId } },
          update: {},
          create: { name: city, countryId: effectiveCountryId },
        });
        cityId = cityRow.id;
      } else {
        cityId = null;
      }
    }

    await tx.application.update({
      where: { id },
      data: {
        ...rest,
        ...(companyId ? { companyId } : {}),
        ...(countryId !== undefined ? { countryId } : {}),
        ...(cityId !== undefined ? { cityId } : {}),
      },
    });
  });

  revalidateApplicationPaths(id);
}

export async function updateApplicationStatus(id: string, statusId: string) {
  await prisma.application.update({ where: { id }, data: { statusId } });
  revalidateApplicationPaths(id);
}

/**
 * One-click shortcut from "En préparation" to "Envoyée" — the single most
 * common transition once the cover letter/tracking info is ready. Also sets
 * appliedAt to today if it isn't already recorded, same convention as the
 * "already applied" import flow (never overwrites a date the user already
 * set on purpose, e.g. from the tracking form above).
 */
export async function markApplicationAsSent(id: string) {
  const [stages, current] = await Promise.all([
    ensureApplicationPipelineStages(),
    prisma.application.findUniqueOrThrow({ where: { id }, select: { appliedAt: true } }),
  ]);
  const appliedStage = stages.find((s) => s.key === "APPLIED");
  if (!appliedStage) throw new Error('Statut "Envoyée" introuvable.');

  await prisma.application.update({
    where: { id },
    data: { statusId: appliedStage.id, appliedAt: current.appliedAt ?? new Date() },
  });
  revalidateApplicationPaths(id);
}

export async function deleteApplication(id: string) {
  await prisma.application.delete({ where: { id } });
  revalidateApplicationPaths();
}

const spontaneousApplicationSchema = z.object({
  companyName: z.string().trim().min(1, "L'entreprise est requise"),
  targetRole: z.string().trim().min(1, "Précisez le rôle ou domaine visé"),
  channel: z.enum(["EMAIL", "LINKEDIN", "WEBSITE", "CONTACT", "OTHER"]),
  recipientName: z.preprocess(emptyToNull, z.string().trim().nullable().optional()),
  recipientValue: z.preprocess(emptyToNull, z.string().trim().nullable().optional()),
  companyResearch: z.preprocess(emptyToNull, z.string().trim().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().trim().nullable().optional()),
  availability: z.preprocess(emptyToNull, z.string().trim().nullable().optional()),
  action: z.enum(["PREPARE", "ALREADY_APPLIED"]),
});

export type SpontaneousApplicationInput = z.infer<typeof spontaneousApplicationSchema>;

/** Creates a lightweight prospect without inventing a job description or a
 * compatibility percentage. The preparation workspace will instead use the
 * user's company research, target role and channel to build a grounded angle. */
export async function createSpontaneousApplication(raw: SpontaneousApplicationInput) {
  const data = spontaneousApplicationSchema.parse(raw);
  const [stages, company] = await Promise.all([
    ensureApplicationPipelineStages(),
    prisma.company.findFirst({ where: { name: data.companyName } }),
  ]);
  const companyRow = company ?? (await prisma.company.create({ data: { name: data.companyName } }));
  const sent = data.action === "ALREADY_APPLIED";
  const stage = stages.find((item) => item.key === (sent ? "APPLIED" : "PREPARING"));
  if (!stage) throw new Error("Statut de candidature introuvable");

  const now = new Date();
  const followUpAt = sent ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) : null;
  const application = await prisma.application.create({
    data: {
      title: data.targetRole,
      targetRole: data.targetRole,
      companyId: companyRow.id,
      statusId: stage.id,
      applicationType: "SPONTANEOUS",
      outreachChannel: data.channel,
      recipientName: data.recipientName,
      recipientValue: data.recipientValue,
      companyResearch: data.companyResearch,
      notes: [data.notes, data.availability ? `Disponibilité : ${data.availability}` : null].filter(Boolean).join("\n\n") || null,
      source: "Candidature spontanée",
      discoveredAt: now,
      appliedAt: sent ? now : null,
      contactedAt: sent ? now : null,
      followUpAt,
      nextAction: sent ? "Relancer si aucune réponse" : "Préparer le message de prise de contact",
      nextActionDate: followUpAt,
    },
  });

  revalidateApplicationPaths(application.id);
  return application;
}
