import { getApplicationsWithScores } from "@/lib/data/applications";
import { getReferenceData } from "@/lib/data/reference";
import { KanbanBoardClient as KanbanBoard } from "@/components/kanban/kanban-board-client";

export const metadata = { title: "Kanban" };

export default async function KanbanPage() {
  const [applications, reference] = await Promise.all([getApplicationsWithScores(), getReferenceData()]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Kanban</h1>
        <p className="text-sm text-muted-foreground">Glissez-déposez vos candidatures pour changer leur statut, priorité, pays ou secteur.</p>
      </div>
      <KanbanBoard applications={applications} stages={reference.stages} />
    </div>
  );
}
