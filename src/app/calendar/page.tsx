import { getCalendarItems } from "@/lib/data/calendar";
import { getReferenceData } from "@/lib/data/reference";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata = { title: "Calendrier" };

export default async function CalendarPage() {
  const [items, reference] = await Promise.all([getCalendarItems(), getReferenceData()]);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Calendrier</h1>
        <p className="text-sm text-muted-foreground">Deadlines, relances, entretiens et événements, tous au même endroit.</p>
      </div>
      <CalendarView items={items} reference={reference} />
    </div>
  );
}
