import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { McpSummary } from "@/lib/data/mcp";

/** Read-only roll-up of the MCP (ChatGPT) activity: last sync, totals and the
 * last few calls. Deliberately simple: nothing is configurable here. */
export function McpMonitor({ summary }: { summary: McpSummary }) {
  const { lastActivity, lastIngest, totalCreated, pending, recent } = summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4" /> Synchro ChatGPT
        </CardTitle>
        <CardDescription>
          {lastActivity
            ? `Dernière activité : ${formatDateTime(lastActivity.createdAt)}`
            : "Aucun appel MCP pour le moment. Connecte ChatGPT puis ajoute des offres."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="En attente de tri" value={pending} />
          <Stat label="Ajoutées par ChatGPT" value={totalCreated} />
          <Stat label="Dernier ajout" value={lastIngest ? formatDateTime(lastIngest.createdAt) : "—"} small />
        </div>
        {recent.length > 0 && (
          <div className="flex flex-col divide-y divide-border">
            {recent.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-2 py-2 text-xs first:pt-0 last:pb-0">
                <span className="text-muted-foreground">
                  {formatDateTime(row.createdAt)} · {row.tool}
                </span>
                <span className="flex flex-wrap items-center justify-end gap-1.5">
                  <Badge variant="success">+{row.created}</Badge>
                  {row.skipped > 0 && <Badge variant="outline">{row.skipped} ignoré{row.skipped > 1 ? "s" : ""}</Badge>}
                  {row.rejected > 0 && <Badge variant="danger">{row.rejected} rejeté{row.rejected > 1 ? "s" : ""}</Badge>}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, small }: { label: string; value: number | string; small?: boolean }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted/40 px-3 py-2">
      <p className={small ? "text-sm font-medium text-foreground" : "text-lg font-semibold text-foreground"}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
