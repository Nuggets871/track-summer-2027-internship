import { getLeads } from "@/lib/data/leads";
import { InboxView } from "@/components/inbox/inbox-view";

export const metadata = { title: "Pistes" };

export default async function InboxPage() {
  const leads = await getLeads();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pistes</h1>
        <p className="text-sm text-muted-foreground">Capture rapide d&apos;URLs et d&apos;entreprises à trier, puis convertir en opportunité.</p>
      </div>
      <InboxView leads={leads} />
    </div>
  );
}
