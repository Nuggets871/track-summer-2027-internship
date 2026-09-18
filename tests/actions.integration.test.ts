/**
 * Integration tests against a real (throwaway) SQLite database — created and
 * torn down entirely inside prisma/test.db, never touching dev.db. Exercises
 * the workflows called out as critical in the project brief: updating an
 * opportunity, changing its status, and the backup / CSV import-export
 * round trips.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import Papa from "papaparse";

// Server actions call revalidatePath() after every mutation, which needs a
// live Next.js request context that doesn't exist under plain Vitest — stub
// it out so the actions run exactly as they do in the app, minus that one
// framework hook.
vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
}));

const TEST_DB_PATH = path.join(process.cwd(), "prisma", "test.db");

beforeAll(() => {
  if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH);
  // Apply the checked-in SQLite migrations directly. This keeps the harness
  // deterministic and also preserves migrations that create FTS virtual
  // tables, which `prisma db push` treats as unmanaged drift.
  const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
  for (const directory of readdirSync(migrationsRoot).sort()) {
    const migrationPath = path.join(migrationsRoot, directory, "migration.sql");
    if (!existsSync(migrationPath)) continue;
    execFileSync("sqlite3", [TEST_DB_PATH], { input: readFileSync(migrationPath), stdio: ["pipe", "pipe", "pipe"] });
  }
});

afterAll(async () => {
  const { prisma } = await import("@/lib/prisma");
  await prisma.$disconnect();
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${TEST_DB_PATH}${suffix}`;
    if (existsSync(file)) rmSync(file);
  }
});

describe("core opportunity workflows", () => {
  it("bootstraps every required application stage on a fresh database", async () => {
    const { ensureApplicationPipelineStages } = await import("@/lib/data/pipeline-stages");

    const stages = await ensureApplicationPipelineStages();

    expect(stages.map((stage) => stage.key)).toEqual([
      "SAVED",
      "PREPARING",
      "APPLIED",
      "INTERVIEW",
      "OFFER",
      "REJECTED",
      "ARCHIVED",
    ]);
  });

  it("creates an opportunity, updates it, and moves it through the pipeline", async () => {
    const { prisma } = await import("@/lib/prisma");
    const { updateApplication, updateApplicationStatus } = await import("@/lib/actions/applications");

    const company = await prisma.company.create({ data: { name: "Test Co" } });
    const stageA = await prisma.pipelineStage.create({ data: { key: "TEST_SAVED", label: "Sauvegardée", order: 0, isSystem: true } });
    const stageB = await prisma.pipelineStage.create({ data: { key: "TEST_APPLIED", label: "Envoyée", order: 1, isSystem: true } });

    const application = await prisma.application.create({
      data: { title: "Integration Test Intern", companyId: company.id, statusId: stageA.id, salaryCurrency: "EUR" },
    });

    await updateApplication(application.id, { title: "Integration Test Intern (updated)", notes: "Test note" });
    const updated = await prisma.application.findUniqueOrThrow({ where: { id: application.id } });
    expect(updated.title).toBe("Integration Test Intern (updated)");
    expect(updated.notes).toBe("Test note");

    await updateApplicationStatus(application.id, stageB.id);
    const moved = await prisma.application.findUniqueOrThrow({ where: { id: application.id } });
    expect(moved.statusId).toBe(stageB.id);
  });
});

describe("backup and CSV import/export", () => {
  it("exports a full JSON backup and restores it via import", async () => {
    const { exportFullBackup, importFullBackup } = await import("@/lib/actions/backup");
    const { prisma } = await import("@/lib/prisma");

    const beforeCount = await prisma.application.count();
    const json = await exportFullBackup();
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed.application)).toBe(true);
    expect(parsed.application.length).toBe(beforeCount);

    await importFullBackup(json);

    const afterCount = await prisma.application.count();
    expect(afterCount).toBe(beforeCount);
  });

  it("exports applications to CSV and re-imports them into new companies", async () => {
    const { exportApplicationsCsv, importApplicationsCsv } = await import("@/lib/actions/backup");
    const { prisma } = await import("@/lib/prisma");

    const csv = await exportApplicationsCsv();
    expect(csv).toContain("title");
    expect(csv).toContain("Integration Test Intern");

    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });
    // Simulate importing into a fresh workspace by renaming the company so a new one gets created.
    const rows = parsed.data.map((row) => ({ ...row, company: `${row.company} (import)` }));

    const beforeCount = await prisma.application.count();
    const imported = await importApplicationsCsv(rows);
    expect(imported).toBeGreaterThan(0);

    const afterCount = await prisma.application.count();
    expect(afterCount).toBe(beforeCount + imported);

    const importedCompany = await prisma.company.findFirst({ where: { name: { contains: "(import)" } } });
    expect(importedCompany).not.toBeNull();
  });

  it("exports a display-ready CSV for the companion Google Sheet", async () => {
    const { exportApplicationsForGoogleSheetsCsv } = await import("@/lib/actions/backup");

    const csv = await exportApplicationsForGoogleSheetsCsv();
    const parsed = Papa.parse<Record<string, string>>(csv, { header: true, skipEmptyLines: true });

    expect(parsed.meta.fields).toEqual(expect.arrayContaining([
      "ID",
      "Entreprise",
      "Poste",
      "Statut",
      "Score match",
      "Éligibilité",
      "Lien offre",
    ]));
    expect(parsed.data.some((row) => row.Poste.startsWith("Integration Test Intern"))).toBe(true);
  });
});

describe("MCP internship ingestion", () => {
  it("stages offers in the inbox, skips duplicates, rejects invalid rows, and logs the call", async () => {
    const { addInternships } = await import("@/lib/internships");
    const { prisma } = await import("@/lib/prisma");

    const offers = [
      { company: "MCP Test Co", title: "Data Intern", url: "https://jobs.example.com/data-intern?utm_source=chatgpt", country: "France", city: "Paris", source: "ChatGPT" },
      { company: "MCP Test Co", title: "Backend Intern", url: "https://jobs.example.com/backend-intern", country: "France" },
    ];

    const before = await prisma.lead.count({ where: { status: "NEW" } });
    const first = await addInternships(offers);
    expect(first.map((result) => result.status)).toEqual(["created", "created"]);
    expect(first.every((result) => result.id)).toBe(true);
    expect(await prisma.lead.count({ where: { status: "NEW" } })).toBe(before + 2);

    const stored = await prisma.lead.findFirstOrThrow({ where: { company: "MCP Test Co", role: "Data Intern" } });
    expect(stored.source).toBe("ChatGPT");
    expect(stored.country).toBe("France");
    expect(stored.city).toBe("Paris");

    // The first URL differs only by a tracking param, proving normalization;
    // nothing is added on a second identical run.
    const second = await addInternships(offers);
    expect(second.map((result) => result.status)).toEqual(["skipped", "skipped"]);
    expect(await prisma.lead.count({ where: { status: "NEW" } })).toBe(before + 2);

    // Two identical rows inside one call: first created, second skipped.
    const batch = await addInternships([
      { company: "MCP Batch Co", title: "Role", url: "https://jobs.example.com/batch" },
      { company: "MCP Batch Co", title: "Role", url: "https://jobs.example.com/batch/" },
    ]);
    expect(batch.map((result) => result.status)).toEqual(["created", "skipped"]);

    // One bad row must not block the valid ones: each gets its own verdict.
    const mixed = await addInternships([
      { company: "", title: "No company", url: "https://jobs.example.com/x" },
      { company: "MCP Test Co", title: "Bad URL", url: "not-a-url" },
      { company: "MCP Test Co", title: "Sane", url: "https://jobs.example.com/sane" },
    ]);
    expect(mixed.map((result) => result.status)).toEqual(["rejected", "rejected", "created"]);
    expect(mixed[0].reason).toBeTruthy();
    expect(mixed[1].reason).toBeTruthy();

    const logged = await prisma.mcpActivity.findFirst({ where: { tool: "addInternships" }, orderBy: { createdAt: "desc" } });
    expect(logged).not.toBeNull();
    expect(logged?.created).toBeGreaterThanOrEqual(1);
  });

  it("lists staged offers with their inbox status", async () => {
    const { listInternships } = await import("@/lib/internships");

    const all = await listInternships({ query: "MCP Test Co" });
    expect(all.length).toBeGreaterThan(0);
    expect(all[0]).toMatchObject({ company: "MCP Test Co", status: "À trier" });
    expect(typeof all[0].id).toBe("string");
    expect(all[0].url).toContain("jobs.example.com");
  });
});
