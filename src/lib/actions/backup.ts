"use server";

import { revalidatePath } from "next/cache";
import Papa from "papaparse";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LEGACY_STAGE_KEY_MAP } from "@/lib/constants";
import { ensureApplicationPipelineStages } from "@/lib/data/pipeline-stages";

const EXPORTABLE_MODELS = [
  "country",
  "city",
  "pipelineStage",
  "company",
  "application",
  "jobAnalysis",
  "document",
  "coverLetter",
  "setting",
  "profile",
] as const;

// Guards against a hostile or accidental multi-gigabyte import freezing the
// server while it is parsed in memory.
const MAX_BACKUP_BYTES = 25_000_000;

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
  // API keys are credentials, not portable user data. Never place them in
  // a downloadable backup that may be shared or stored in the cloud.
  if (Array.isArray(data.setting)) {
    data.setting = data.setting.map((row) => ({ ...(row as Record<string, unknown>), deepseekApiKey: null }));
  }
  return JSON.stringify(data, null, 2);
}

/**
 * Restores a full backup. This REPLACES all current data — the caller
 * (Settings > Data & Backup) must have the user confirm explicitly since
 * this is a destructive, irreversible action from the app's point of view.
 */
export async function importFullBackup(jsonText: string) {
  if (typeof jsonText !== "string" || jsonText.length > MAX_BACKUP_BYTES) {
    throw new Error("Backup invalide ou trop volumineux.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("Backup invalide : JSON illisible.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Backup invalide : structure inattendue.");
  }
  const source = parsed as Record<string, unknown>;

  const currentSecret = await prisma.setting.findUnique({ where: { id: "singleton" }, select: { deepseekApiKey: true } });

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
      const rows = source[model];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      for (const rawRow of rows) {
        if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) continue;
        const cleaned = reviveDates(rawRow as Record<string, unknown>);
        // Every row needs a stable id; a backup without one is malformed.
        if (typeof cleaned.id !== "string" || cleaned.id.length === 0) continue;
        if (model === "setting") {
          // A backup cannot overwrite or erase the locally configured key.
          delete cleaned.deepseekApiKey;
          await tx.setting.upsert({ where: { id: cleaned.id }, create: cleaned, update: cleaned });
        } else if (model === "profile") {
          await tx.profile.upsert({ where: { id: cleaned.id }, create: cleaned, update: cleaned });
        } else {
          // Stored file paths must stay inside /uploads — never trust a
          // backup for something that feeds a filesystem read.
          if (model === "document") {
            const safeName = path.basename(String(cleaned.filePath ?? ""));
            if (!safeName) continue;
            cleaned.filePath = safeName;
          }
          // @ts-expect-error - dynamic model access
          await tx[model].create({ data: cleaned });
        }
      }
    }
  });

  if (currentSecret?.deepseekApiKey) {
    await prisma.setting.update({ where: { id: "singleton" }, data: { deepseekApiKey: currentSecret.deepseekApiKey } });
  }

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
 * Deletes every demo application flagged isDemo=true (seeded by
 * `npm run db:seed`). Cascades take care of their child rows (job analysis,
 * cover letter, documents). Never touches user-created data.
 */
export async function clearDemoData() {
  await prisma.$transaction([
    prisma.application.deleteMany({ where: { isDemo: true } }),
    prisma.company.deleteMany({ where: { isDemo: true } }),
  ]);
  revalidatePath("/", "layout");
}

export async function ensureDefaultPipelineStages() {
  await ensureApplicationPipelineStages();
  await migrateLegacyPipelineStages();
}

/**
 * One-time, idempotent upgrade path for local databases created by an
 * earlier version of the app (15 statuses instead of 7): every application
 * on a legacy status is repointed to its consolidated replacement (see
 * LEGACY_STAGE_KEY_MAP), then the now-unused legacy stage is removed.
 * No application is ever deleted — only its statusId changes.
 */
export async function migrateLegacyPipelineStages() {
  const legacyKeys = Object.keys(LEGACY_STAGE_KEY_MAP);
  const legacyStages = await prisma.pipelineStage.findMany({
    where: { kind: "APPLICATION", key: { in: legacyKeys } },
  });
  if (legacyStages.length === 0) return;

  const currentStages = await prisma.pipelineStage.findMany({ where: { kind: "APPLICATION" } });
  const byKey = new Map(currentStages.map((s) => [s.key, s]));

  await prisma.$transaction(async (tx) => {
    for (const legacy of legacyStages) {
      const newKey = LEGACY_STAGE_KEY_MAP[legacy.key];
      const target = byKey.get(newKey);
      if (!target) continue; // shouldn't happen — the 7 defaults are ensured above
      await tx.application.updateMany({ where: { statusId: legacy.id }, data: { statusId: target.id } });
      await tx.pipelineStage.delete({ where: { id: legacy.id } });
    }
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
    appliedAt: a.appliedAt?.toISOString().slice(0, 10) ?? "",
    deadline: a.deadline?.toISOString().slice(0, 10) ?? "",
    salaryAmount: a.salaryAmount ?? "",
    salaryCurrency: a.salaryCurrency ?? "",
    jobUrl: a.jobUrl ?? "",
    notes: a.notes ?? "",
  }));

  return Papa.unparse({ fields: [...CSV_COLUMNS], data: rows });
}

const csvRowSchema = z.object({
  title: z.string().trim().min(1),
  company: z.string().trim().min(1),
  country: z.string().optional(),
  city: z.string().optional(),
  sector: z.string().optional(),
  source: z.string().optional(),
  status: z.string().optional(),
  appliedAt: z.string().optional(),
  deadline: z.string().optional(),
  salaryAmount: z.string().optional(),
  salaryCurrency: z.string().optional(),
  jobUrl: z.string().optional(),
  notes: z.string().optional(),
});

function safeDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function importApplicationsCsv(rows: Record<string, string>[]) {
  const stages = await prisma.pipelineStage.findMany({ where: { kind: "APPLICATION" } });
  const defaultStage = stages.find((s) => s.key === "SAVED") ?? stages[0];
  if (!defaultStage) throw new Error("Aucun statut de candidature configuré.");
  let imported = 0;

  for (const row of rows) {
    const parsed = csvRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const r = parsed.data;

    const company =
      (await prisma.company.findFirst({ where: { name: r.company } })) ??
      (await prisma.company.create({ data: { name: r.company, isDemo: false } }));

    let countryId: string | undefined;
    if (r.country) {
      const country = await prisma.country.upsert({
        where: { name: r.country },
        create: { name: r.country },
        update: {},
      });
      countryId = country.id;
    }

    const status = stages.find((s) => s.label.toLowerCase() === r.status?.toLowerCase());
    const salaryAmount = r.salaryAmount ? Number(r.salaryAmount) : null;

    await prisma.application.create({
      data: {
        title: r.title,
        companyId: company.id,
        countryId,
        sector: r.sector || null,
        source: r.source || null,
        statusId: status?.id ?? defaultStage.id,
        appliedAt: safeDate(r.appliedAt),
        deadline: safeDate(r.deadline),
        salaryAmount: salaryAmount !== null && Number.isFinite(salaryAmount) ? salaryAmount : null,
        salaryCurrency: r.salaryCurrency || "EUR",
        jobUrl: r.jobUrl || null,
        notes: r.notes || null,
      },
    });
    imported += 1;
  }

  revalidatePath("/", "layout");
  revalidatePath("/opportunities");
  return imported;
}
