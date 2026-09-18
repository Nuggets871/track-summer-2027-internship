import { describe, expect, it } from "vitest";
import { isBearerAuthorized, safeEqual } from "@/lib/mcp/auth";

describe("MCP auth helpers", () => {
  it("safeEqual matches identical secrets and rejects anything else", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "abc")).toBe(false);
    expect(safeEqual(null, "abc")).toBe(false);
    expect(safeEqual("abc", undefined)).toBe(false);
    expect(safeEqual(null, null)).toBe(false);
  });

  it("isBearerAuthorized accepts only a matching Bearer header", () => {
    expect(isBearerAuthorized("Bearer secret", "secret")).toBe(true);
    expect(isBearerAuthorized("bearer secret", "secret")).toBe(true);
    expect(isBearerAuthorized("Bearer wrong", "secret")).toBe(false);
    expect(isBearerAuthorized("Basic secret", "secret")).toBe(false);
    expect(isBearerAuthorized(null, "secret")).toBe(false);
    expect(isBearerAuthorized("Bearer secret", undefined)).toBe(false);
  });
});
