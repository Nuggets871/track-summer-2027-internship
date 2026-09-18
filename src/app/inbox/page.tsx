import { getLeads } from "@/lib/data/leads";
import { getMcpSummary } from "@/lib/data/mcp";
import { InboxView } from "@/components/inbox/inbox-view";
import { McpMonitor } from "@/components/inbox/mcp-monitor";

export const metadata = { title: "Pistes" };

export default async function InboxPage() {
  const [leads, summary] = await Promise.all([getLeads(), getMcpSummary()]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pistes</h1>
        <p className="text-sm text-muted-foreground">
          Offres à trier — ajoutées par ChatGPT ou collées à la main — puis convertir en opportunité ou écarter.
        </p>
      </div>
      <McpMonitor summary={summary} />
      <InboxView leads={leads} />
    </div>
  );
}
