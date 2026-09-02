import { getAllTasks } from "@/lib/data/tasks";
import { getReferenceData } from "@/lib/data/reference";
import { TasksBoard } from "@/components/tasks/tasks-board";

export const metadata = { title: "Tâches" };

export default async function TasksPage() {
  const [tasks, reference] = await Promise.all([getAllTasks(), getReferenceData()]);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Tâches</h1>
        <p className="text-sm text-muted-foreground">Toutes vos actions, organisées par échéance.</p>
      </div>
      <TasksBoard tasks={tasks} reference={reference} />
    </div>
  );
}
