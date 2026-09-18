import { timingSafeEqual } from "node:crypto";

/** Shared secret sent as `Authorization: Bearer <token>` (Cursor, Codex, API). */
export const MCP_TOKEN_ENV = "MCP_AUTH_TOKEN";

/**
 * Shared secret sent as `?key=<token>` in the connector URL (ChatGPT's web
 * connector UI only supports OAuth / None / Mixed, never a static header — so
 * the token rides in the URL instead).
 */
export const MCP_URL_TOKEN_ENV = "MCP_URL_TOKEN";

/**
 * Constant-time comparison of two secrets. Returns false when either side is
 * missing, so an unconfigured server is never reachable.
 */
export function safeEqual(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Checks an `Authorization: Bearer <token>` header against the configured
 * secret. Returns false for a missing/malformed header or an empty expected
 * token.
 */
export function isBearerAuthorized(authorizationHeader: string | null | undefined, expectedToken: string | null | undefined): boolean {
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader ?? "");
  if (!match) return false;
  return safeEqual(match[1], expectedToken);
}
