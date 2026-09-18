import { createMcpHandler } from "@modelcontextprotocol/server";
import { buildMcpServer } from "@/lib/mcp/server";
import { isBearerAuthorized, safeEqual, MCP_TOKEN_ENV, MCP_URL_TOKEN_ENV } from "@/lib/mcp/auth";

// Prisma and node:crypto need the Node.js runtime; MCP exchanges are never
// cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createMcpHandler(() => buildMcpServer());

function authError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "content-type": "application/json",
      "WWW-Authenticate": 'Bearer realm="stage-copilot-mcp"',
    },
  });
}

async function handle(request: Request): Promise<Response> {
  const bearerToken = process.env[MCP_TOKEN_ENV];
  const urlToken = process.env[MCP_URL_TOKEN_ENV];

  if (!bearerToken && !urlToken) {
    return authError(503, `Neither ${MCP_TOKEN_ENV} nor ${MCP_URL_TOKEN_ENV} is configured on the server.`);
  }

  // Accept either the header (Cursor/Codex/API) or the URL key (ChatGPT's web
  // connector, which cannot send a static Authorization header).
  const urlKey = new URL(request.url).searchParams.get("key");
  const authorized =
    isBearerAuthorized(request.headers.get("authorization"), bearerToken) || safeEqual(urlKey, urlToken);

  if (!authorized) {
    return authError(401, "Unauthorized");
  }
  return handler.fetch(request);
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handle(request);
}
