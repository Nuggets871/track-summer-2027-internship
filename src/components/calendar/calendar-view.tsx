"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export type CalendarEventDTO = {
  id: string;
  date: string;
  kind: "DEADLINE" | "NEXT_ACTION" | "APPLIED";
  label: string;
  href: string;
};

const KIND_STYLES: Record<CalendarEventDTO["kind"], { dot: string; badge: string; label: string }> = {
  DEADLINE: { dot: "bg-danger", badge: "danger", label: "Deadline" },
  NEXT_ACTION: { dot: "bg-warning", badge: "warning", label: "Action" },
  APPLIED: { dot: "bg-primary", badge: "primary", label: "Envoyée" },
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function CalendarView({ events }: { events: CalendarEventDTO[] }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(() => new Date());

  const parsed = useMemo(
    () => events.map((event) => ({ ...event, when: new Date(event.date) })),
    [events],
  );

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEventDTO[]>();
    for (const event of parsed) {
      const key = format(event.when, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [parsed]);

  const monthEvents = useMemo(
    () => parsed.filter((event) => isSameMonth(event.when, cursor)),
    [parsed, cursor],
  );
  const monthCounts = {
    applied: monthEvents.filter((e) => e.kind === "APPLIED").length,
    deadlines: monthEvents.filter((e) => e.kind === "DEADLINE").length,
    actions: monthEvents.filter((e) => e.kind === "NEXT_ACTION").length,
  };

  const selectedEvents = useMemo(
    () => (byDay.get(format(selected, "yyyy-MM-dd")) ?? []).sort((a, b) => a.kind.localeCompare(b.kind)),
    [byDay, selected],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => subMonths(c, 1))} aria-label="Mois précédent">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-foreground">
            {format(cursor, "MMMM yyyy", { locale: fr })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Mois suivant">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setCursor(startOfMonth(new Date())); setSelected(new Date()); }}>
            Aujourd&apos;hui
          </Button>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/calendar/ics" download>
            <Download className="size-3.5" /> Export .ics
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Envoyées ce mois" value={monthCounts.applied} dot="bg-primary" />
        <SummaryTile label="Deadlines ce mois" value={monthCounts.deadlines} dot="bg-danger" />
        <SummaryTile label="Actions ce mois" value={monthCounts.actions} dot="bg-warning" />
        <SummaryTile label="Total planifié" value={monthEvents.length} dot="bg-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {day}
                </div>
              ))}
              {monthDays.map((day) => {
                const dayEvents = byDay.get(format(day, "yyyy-MM-dd")) ?? [];
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selected);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelected(day)}
                    className={cn(
                      "flex min-h-[72px] flex-col gap-1 rounded-md border p-1.5 text-left transition-colors",
                      isSameMonth(day, cursor) ? "bg-surface" : "bg-surface-muted/30 text-subtle-foreground",
                      isSelected ? "border-primary" : "border-border hover:border-border-strong",
                    )}
                  >
                    <span className={cn("text-xs font-medium tabular-nums", isToday && "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground")}>
                      {format(day, "d")}
                    </span>
                    <span className="flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 4).map((event) => (
                        <span key={event.id} className={cn("size-1.5 rounded-full", KIND_STYLES[event.kind].dot)} />
                      ))}
                      {dayEvents.length > 4 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 4}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" />
              {format(selected, "EEEE d MMMM", { locale: fr })}
            </CardTitle>
            <CardDescription>
              {selectedEvents.length === 0 ? "Rien de prévu ce jour-là." : `${selectedEvents.length} élément${selectedEvents.length > 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {selectedEvents.length === 0 ? (
              <EmptyState title="Journée libre" description="Sélectionne un jour avec un point coloré." />
            ) : (
              selectedEvents.map((event) => (
                <Link
                  key={event.id}
                  href={event.href}
                  className="flex items-start gap-2 rounded-md border border-border p-2.5 text-sm transition-colors hover:border-border-strong"
                >
                  <span className={cn("mt-1 size-2 shrink-0 rounded-full", KIND_STYLES[event.kind].dot)} />
                  <span className="min-w-0 flex-1">
                    <Badge variant="outline" className="mb-1">
                      {KIND_STYLES[event.kind].label}
                    </Badge>
                    <span className="block text-foreground">{event.label}</span>
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
      <span className={cn("size-2.5 rounded-full", dot)} />
      <div>
        <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
