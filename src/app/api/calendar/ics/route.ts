import { NextResponse } from "next/server";
import { getCalendarEvents } from "@/lib/data/calendar";

function toIcsDate(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Read-only feed of deadlines and next actions, importable in any calendar app. */
export async function GET() {
  const events = await getCalendarEvents();
  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Stage Copilot//FR",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Stage Copilot",
  ];

  for (const event of events) {
    const label = event.kind === "APPLIED" ? "✅ " : event.kind === "DEADLINE" ? "⏰ " : "🔁 ";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@stage-copilot`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcsDate(event.date)}`,
      `SUMMARY:${escapeIcs(label + event.label)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="stage-copilot.ics"',
      "Cache-Control": "no-store",
    },
  });
}
