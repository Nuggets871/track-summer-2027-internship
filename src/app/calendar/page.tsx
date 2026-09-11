import { getCalendarEvents } from "@/lib/data/calendar";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata = { title: "Calendrier" };

export default async function CalendarPage() {
  const events = await getCalendarEvents();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Calendrier</h1>
        <p className="text-sm text-muted-foreground">Deadlines, relances et candidatures envoyées, récapitulés par jour et par mois.</p>
      </div>
      <CalendarView
        events={events.map((event) => ({
          id: event.id,
          date: event.date.toISOString(),
          kind: event.kind,
          label: event.label,
          href: event.href,
        }))}
      />
    </div>
  );
}
