import { getOpportunities } from "@/lib/data/applications";
import { ensureApplicationPipelineStages } from "@/lib/data/pipeline-stages";
import { OpportunitiesTable } from "@/components/opportunities/opportunities-table";
import { JobImportWidget } from "@/components/job-import/job-import-widget";

export const metadata = { title: "Opportunités" };

export default async function OpportunitiesPage() {
  const [opportunities, stages] = await Promise.all([
    getOpportunities(),
    ensureApplicationPipelineStages(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Opportunités</h1>
        <p className="text-sm text-muted-foreground">{opportunities.length} opportunité{opportunities.length > 1 ? "s" : ""} au total.</p>
      </div>
      <JobImportWidget />
      <OpportunitiesTable opportunities={opportunities} stages={stages} />
    </div>
  );
}
