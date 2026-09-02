import { describe, expect, it } from "vitest";
import { clamp, daysBetween, daysUntil, formatCurrency, safeJsonParse, slugify } from "@/lib/utils";

describe("clamp", () => {
  it("clamps a value inside the given bounds", () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(42, 0, 100)).toBe(42);
  });
});

describe("daysBetween / daysUntil", () => {
  it("counts whole days between two dates", () => {
    const a = new Date("2026-09-01T00:00:00Z");
    const b = new Date("2026-09-05T00:00:00Z");
    expect(daysBetween(a, b)).toBe(4);
  });

  it("returns null for a missing date", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(undefined)).toBeNull();
  });

  it("returns a negative number for a date in the past", () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(daysUntil(past)).toBeLessThanOrEqual(-4);
  });
});

describe("formatCurrency", () => {
  it("formats an amount with the given currency", () => {
    expect(formatCurrency(1000, "EUR")).toContain("1");
    expect(formatCurrency(null)).toBe("—");
  });
});

describe("slugify", () => {
  it("produces a lowercase, hyphenated, accent-free slug", () => {
    expect(slugify("Candidature Prête !")).toBe("candidature-prete");
    expect(slugify("À explorer")).toBe("a-explorer");
  });
});

describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
  });

  it("falls back on invalid JSON instead of throwing", () => {
    expect(safeJsonParse("not json", { fallback: true })).toEqual({ fallback: true });
    expect(safeJsonParse(null, [])).toEqual([]);
  });
});
