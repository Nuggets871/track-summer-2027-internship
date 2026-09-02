import { getApplicationsWithScores } from "@/lib/data/applications";
import { getReferenceData } from "@/lib/data/reference";
import { ApplicationsTable } from "@/components/applications/applications-table";

export const metadata = { title: "Candidatures · Tracker" };

export default async function ApplicationsPage() {
  const [applications, reference] = await Promise.all([getApplicationsWithScores(), getReferenceData()]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tracker de candidatures</h1>
        <p className="text-sm text-muted-foreground">Toutes vos candidatures, filtrables et triables en un coup d&apos;œil.</p>
      </div>
      <ApplicationsTable applications={applications} reference={reference} stages={reference.stages} />
    </div>
  );
}
