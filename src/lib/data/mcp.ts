import { prisma } from "@/lib/prisma";

export type McpActivityRow = {
  id: string;
  tool: string;
  created: number;
  skipped: number;
  rejected: number;
  listed: number | null;
  createdAt: Date;
};

export type McpSummary = {
  lastActivity: McpActivityRow | null;
  lastIngest: McpActivityRow | null;
  totalCreated: number;
  totalSkipped: number;
  totalRejected: number;
  pending: number;
  recent: McpActivityRow[];
};

/** Read-only roll-up of what ChatGPT did through the MCP server, for the
 * Pistes page's monitoring panel. */
export async function getMcpSummary(): Promise<McpSummary> {
  const [lastActivity, lastIngest, totals, pending, recent] = await Promise.all([
    prisma.mcpActivity.findFirst({ orderBy: { createdAt: "desc" } }),
    prisma.mcpActivity.findFirst({ where: { tool: "addInternships" }, orderBy: { createdAt: "desc" } }),
    prisma.mcpActivity.aggregate({
      where: { tool: "addInternships" },
      _sum: { created: true, skipped: true, rejected: true },
    }),
    prisma.lead.count({ where: { status: "NEW" } }),
    prisma.mcpActivity.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return {
    lastActivity,
    lastIngest,
    totalCreated: totals._sum.created ?? 0,
    totalSkipped: totals._sum.skipped ?? 0,
    totalRejected: totals._sum.rejected ?? 0,
    pending,
    recent,
  };
}
