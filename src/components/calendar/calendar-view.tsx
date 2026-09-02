"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { EventForm } from "@/components/forms/event-form";
import { EVENT_TYPES, colorFor } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { CalendarItem } from "@/lib/data/calendar";
import type { ReferenceData } from "@/lib/data/reference";

type View = "month" | "week" | "agenda";

export function CalendarView({ items, reference }: { items: CalendarItem[]; reference: ReferenceData }) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [createDate, setCreateDate] = useState<Date | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = format(item.date, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  const days = useMemo(() => {
    if (view === "month") {
      return eachDayOfInterval({
        start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
      });
    }
    if (view === "week") {
      return eachDayOfInterval({ start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) });
    }
    return [];
  }, [view, cursor]);

  const navigate = (dir: 1 | -1) => {
    if (view === "month") setCursor((c) => addMonths(c, dir));
    else if (view === "week") setCursor((c) => addWeeks(c, dir));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <p className="w-40 text-sm font-medium capitalize text-foreground">{format(cursor, "MMMM yyyy", { locale: fr })}</p>
          <Button variant="outline" size="icon-sm" onClick={() => navigate(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())}>
            Aujourd&apos;hui
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as View)}>
            <TabsList>
              <TabsTrigger value="month">Mois</TabsTrigger>
              <TabsTrigger value="week">Semaine</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" onClick={() => setCreateDate(new Date())}>
            <Plus /> Événement
          </Button>
        </div>
      </div>

      {view !== "agenda" ? (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="bg-surface-muted py-1.5 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const dayItems = byDay.get(format(day, "yyyy-MM-dd")) ?? [];
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex min-h-28 flex-col gap-1 bg-surface p-1.5",
                  view === "month" && !isSameMonth(day, cursor) && "bg-surface/50 text-subtle-foreground",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("flex size-5 items-center justify-center rounded-full text-xs", isToday(day) && "bg-primary text-primary-foreground")}>
                    {format(day, "d")}
                  </span>
                  <button className="text-subtle-foreground hover:text-foreground" onClick={() => setCreateDate(day)}>
                    <Plus className="size-3" />
                  </button>
                </div>
                <div className="flex flex-col gap-0.5 overflow-y-auto">
                  {dayItems.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="truncate rounded px-1 py-0.5 text-[11px] leading-tight text-white"
                      style={{ backgroundColor: colorFor(EVENT_TYPES, item.type) }}
                      title={item.title}
                    >
                      {item.title}
                    </Link>
                  ))}
                  {dayItems.length > 4 && <span className="text-[10px] text-subtle-foreground">+{dayItems.length - 4} autres</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.filter((i) => i.date >= new Date(new Date().setHours(0, 0, 0, 0))).length === 0 ? (
            <p className="text-sm text-muted-foreground">Rien de prévu à venir.</p>
          ) : (
            items
              .filter((i) => i.date >= new Date(new Date().setHours(0, 0, 0, 0)))
              .slice(0, 60)
              .map((item) => (
                <Link key={item.id} href={item.href} className="flex items-center gap-3 rounded-md border border-border bg-surface p-3 text-sm hover:border-border-strong">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(EVENT_TYPES, item.type) }} />
                  <span className="w-28 shrink-0 text-xs text-muted-foreground">{formatDate(item.date, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="flex-1 text-foreground">{item.title}</span>
                </Link>
              ))
          )}
        </div>
      )}

      <Dialog open={!!createDate} onOpenChange={(o) => !o && setCreateDate(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nouvel événement</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            {createDate && <EventForm reference={reference} defaultDate={createDate} onSuccess={() => setCreateDate(null)} />}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
