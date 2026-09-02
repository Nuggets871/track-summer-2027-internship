"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PIPELINE_STAGES } from "@/lib/constants";

const EXPORTABLE_MODELS = [
  "country",
  "city",
  "pipelineStage",
  "company",
  "contact",
  "application",
  "jobAnalysis",
  "interaction",
  "task",
  "event",
  "document",
  "coverLetter",
  "interview",
  "interviewPrep",
  "question",
  "offer",
  "researchItem",
  "note",
  "tag",
  "weeklyReview",
  "savedView",
  "setting",
  "profile",
] as const;

/**
 * Full JSON export of every table — the "backup" the brief asks for so a
 * bad click can never wipe months of tracked data for good.
 */
export async function exportFullBackup() {
  const data: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    version: 1,
  };
  for (const model of EXPORTABLE_MODELS) {
    // @ts-expect-error - dynamic model access, all keys are valid Prisma delegates
    data[model] = await prisma[model].findMany();
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Restores a full backup. This REPLACES all current data — the caller
 * (Settings > Data & Backup) must have the user confirm explicitly since
 * this is a destructive, irreversible action from the app's point of view.
 */
export async function importFullBackup(jsonText: string) {
  const parsed = JSON.parse(jsonText);

  await prisma.$transaction(async (tx) => {
    // Delete in dependency order (children first).
    const deletionOrder = [...EXPORTABLE_MODELS].reverse();
    for (const model of deletionOrder) {
      if (model === "setting" || model === "profile") continue;
      // @ts-expect-error - dynamic model access
      await tx[model].deleteMany();
    }
    // Recreate in dependency order (parents first).
    for (const model of EXPORTABLE_MODELS) {
      const rows = parsed[model];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      for (const row of rows) {
        const cleaned = reviveDates(row);
        if (model === "setting") {
          await tx.setting.upsert({ where: { id: cleaned.id }, create: cleaned, update: cleaned });
        } else if (model === "profile") {
          await tx.profile.upsert({ where: { id: cleaned.id }, create: cleaned, update: cleaned });
        } else {
          // @ts-expect-error - dynamic model access
          await tx[model].create({ data: cleaned });
        }
      }
    }
  });

  revalidatePath("/", "layout");
}

function reviveDates<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      result[key] = new Date(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Deletes every row flagged isDemo=true (companies/applications/tasks/events
 * seeded by `npm run db:seed`). Cascades take care of their child rows
 * (interactions, documents, interviews...). Never touches user-created data.
 */
export async function clearDemoData() {
  await prisma.$transaction([
    prisma.task.deleteMany({ where: { isDemo: true } }),
    prisma.event.deleteMany({ where: { isDemo: true } }),
    prisma.application.deleteMany({ where: { isDemo: true } }),
    prisma.contact.deleteMany({ where: { isDemo: true } }),
    prisma.company.deleteMany({ where: { isDemo: true } }),
  ]);
  revalidatePath("/", "layout");
}

export async function ensureDefaultPipelineStages() {
  const count = await prisma.pipelineStage.count({ where: { kind: "APPLICATION" } });
  if (count > 0) return;
  await prisma.pipelineStage.createMany({
    data: DEFAULT_PIPELINE_STAGES.map((s) => ({ ...s, isSystem: true, kind: "APPLICATION" })),
  });
}

// --- CSV --------------------------------------------------------------

const CSV_COLUMNS = [
  "title",
  "company",
  "country",
  "city",
  "sector",
  "source",
  "status",
  "priority",
  "appliedAt",
  "deadline",
  "salaryAmount",
  "salaryCurrency",
  "jobUrl",
  "notes",
] as const;

export async function exportApplicationsCsv() {
  const applications = await prisma.application.findMany({
    include: { company: true, country: true, city: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = applications.map((a) => ({
    title: a.title,
    company: a.company.name,
    country: a.country?.name ?? "",
    city: a.city?.name ?? "",
    sector: a.sector ?? "",
    source: a.source ?? "",
    status: a.status.label,
    priority: a.priority,
    appliedAt: a.appliedAt?.toISOString().slice(0, 10) ?? "",
    deadline: a.deadline?.toISOString().slice(0, 10) ?? "",
    salaryAmount: a.salaryAmount ?? "",
    salaryCurrency: a.salaryCurrency ?? "",
    jobUrl: a.jobUrl ?? "",
    notes: a.notes ?? "",
  }));

  return Papa.unparse({ fields: [...CSV_COLUMNS], data: rows });
}

export async function importApplicationsCsv(rows: Record<string, string>[]) {
  const stages = await prisma.pipelineStage.findMany({ where: { kind: "APPLICATION" } });
  const defaultStage = stages.find((s) => s.key === "TO_EXPLORE") ?? stages[0];
  let imported = 0;

  for (const row of rows) {
    if (!row.title || !row.company) continue;

    const company =
      (await prisma.company.findFirst({ where: { name: row.company } })) ??
      (await prisma.company.create({ data: { name: row.company, isDemo: false } }));

    let countryId: string | undefined;
    if (row.country) {
      const country = await prisma.country.upsert({
        where: { name: row.country },
        create: { name: row.country },
        update: {},
      });
      countryId = country.id;
    }

    const status = stages.find((s) => s.label.toLowerCase() === row.status?.toLowerCase());

    await prisma.application.create({
      data: {
        title: row.title,
        companyId: company.id,
        countryId,
        sector: row.sector || null,
        source: row.source || null,
        statusId: status?.id ?? defaultStage.id,
        priority: row.priority || "MEDIUM",
        appliedAt: row.appliedAt ? new Date(row.appliedAt) : null,
        deadline: row.deadline ? new Date(row.deadline) : null,
        salaryAmount: row.salaryAmount ? Number(row.salaryAmount) : null,
        salaryCurrency: row.salaryCurrency || "EUR",
        jobUrl: row.jobUrl || null,
        notes: row.notes || null,
      },
    });
    imported += 1;
  }

  revalidatePath("/", "layout");
  revalidatePath("/applications");
  return imported;
}
