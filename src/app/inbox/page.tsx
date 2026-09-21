import { getAdvertisedLeads, getSpontaneousLeads } from "@/lib/data/leads";
import { getMcpSummary } from "@/lib/data/mcp";
import { InboxView } from "@/components/inbox/inbox-view";
import { McpMonitor } from "@/components/inbox/mcp-monitor";

export const metadata = { title: "Pistes" };

export default async function InboxPage() {
  const [advertisedLeads, spontaneousLeads, summary] = await Promise.all([
    getAdvertisedLeads(),
    getSpontaneousLeads(),
    getMcpSummary(),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pistes</h1>
        <p className="text-sm text-muted-foreground">
          Offres publiées et candidatures spontanées déposées par ChatGPT via MCP, à convertir en opportunité ou à écarter.
        </p>
      </div>
      <McpMonitor summary={summary} />
      <InboxView advertisedLeads={advertisedLeads} spontaneousLeads={spontaneousLeads} />
    </div>
  );
}
