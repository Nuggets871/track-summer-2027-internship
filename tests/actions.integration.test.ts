/**
 * Integration tests against a real (throwaway) SQLite database — created and
 * torn down entirely inside prisma/test.db, never touching dev.db. Exercises
 * the workflows called out as critical in the project brief: updating an
 * opportunity, changing its status, and the backup / CSV import-export
 * round trips.
 */
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
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
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: "file:./test.db", CHECKPOINT_DISABLE: "1" },
    stdio: "pipe",
  });
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
});
