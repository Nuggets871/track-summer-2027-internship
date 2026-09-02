"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { updateApplicationStatus, updateApplication } from "@/lib/actions/applications";
import { PRIORITY_LEVELS, labelFor, colorFor } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import type { ApplicationWithScore } from "@/lib/data/applications";
import type { PipelineStage } from "@prisma/client";

type Mode = "status" | "priority" | "country" | "sector";

type Column = { key: string; label: string; color?: string };

function KanbanCard({ app }: { app: ApplicationWithScore }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(isDragging && "z-10 opacity-70")}>
      <Card className="cursor-grab p-3 active:cursor-grabbing">
        <Link href={`/applications/${app.id}`} onClick={(e) => isDragging && e.preventDefault()} className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Avatar name={app.company.name} src={app.company.logoUrl} size={24} />
            <span className="truncate text-sm font-medium text-foreground">{app.company.name}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">{app.title}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge dotColor={colorFor(PRIORITY_LEVELS, app.priority)} className="text-[10px]">
              {labelFor(PRIORITY_LEVELS, app.priority)}
            </Badge>
            {app.country && <span className="text-[11px] text-subtle-foreground">{app.country.name}</span>}
          </div>
          {app.deadline && <p className="text-[11px] text-subtle-foreground">Deadline {formatDate(app.deadline)}</p>}
          {app.nextAction && <p className="truncate text-[11px] text-primary">{app.nextAction}</p>}
        </Link>
      </Card>
    </div>
  );
}

function KanbanColumn({ column, apps }: { column: Column; apps: ApplicationWithScore[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface-muted/40 p-2.5 transition-colors",
        isOver && "border-primary/50 bg-primary-soft/40",
      )}
    >
      <div className="flex items-center gap-2 px-1">
        {column.color && <span className="size-2 rounded-full" style={{ backgroundColor: column.color }} />}
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{column.label}</h3>
        <span className="ml-auto text-xs text-subtle-foreground">{apps.length}</span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {apps.map((a) => (
          <KanbanCard key={a.id} app={a} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ applications, stages }: { applications: ApplicationWithScore[]; stages: PipelineStage[] }) {
  const [mode, setMode] = useState<Mode>("status");
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localApps, setLocalApps] = useState(applications);

  const columns: Column[] = useMemo(() => {
    if (mode === "status") return stages.map((s) => ({ key: s.id, label: s.label, color: s.color }));
    if (mode === "priority") return PRIORITY_LEVELS.map((p) => ({ key: p.value, label: p.label, color: p.color }));
    if (mode === "country") {
      const set = new Map<string, string>();
      localApps.forEach((a) => a.country && set.set(a.country.id, a.country.name));
      return [...set.entries()].map(([key, label]) => ({ key, label }));
    }
    const set = new Set<string>();
    localApps.forEach((a) => a.sector && set.add(a.sector));
    return [...set].map((s) => ({ key: s, label: s }));
  }, [mode, stages, localApps]);

  const grouped = useMemo(() => {
    const map = new Map<string, ApplicationWithScore[]>();
    for (const col of columns) map.set(col.key, []);
    for (const app of localApps) {
      const key = mode === "status" ? app.statusId : mode === "priority" ? app.priority : mode === "country" ? app.countryId ?? "" : app.sector ?? "";
      if (map.has(key)) map.get(key)!.push(app);
    }
    return map;
  }, [columns, localApps, mode]);

  const activeApp = localApps.find((a) => a.id === activeId);

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const appId = active.id as string;
    const targetKey = over.id as string;
    const app = localApps.find((a) => a.id === appId);
    if (!app) return;

    const currentKey = mode === "status" ? app.statusId : mode === "priority" ? app.priority : mode === "country" ? app.countryId ?? "" : app.sector ?? "";
    if (currentKey === targetKey) return;

    setLocalApps((prev) =>
      prev.map((a) => {
        if (a.id !== appId) return a;
        if (mode === "status") {
          const stage = stages.find((s) => s.id === targetKey);
          return stage ? { ...a, statusId: stage.id, status: stage } : a;
        }
        if (mode === "priority") return { ...a, priority: targetKey };
        if (mode === "country") return a; // label refresh happens on next server fetch
        if (mode === "sector") return { ...a, sector: targetKey };
        return a;
      }),
    );

    startTransition(async () => {
      if (mode === "status") await updateApplicationStatus(appId, targetKey);
      if (mode === "priority") await updateApplication(appId, { priority: targetKey });
      if (mode === "country") await updateApplication(appId, { countryId: targetKey });
      if (mode === "sector") await updateApplication(appId, { sector: targetKey });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
        <TabsList>
          <TabsTrigger value="status">Pipeline</TabsTrigger>
          <TabsTrigger value="priority">Priorité</TabsTrigger>
          <TabsTrigger value="country">Pays</TabsTrigger>
          <TabsTrigger value="sector">Secteur</TabsTrigger>
        </TabsList>
      </Tabs>

      <DndContext onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {columns.map((col) => (
            <KanbanColumn key={col.key} column={col} apps={grouped.get(col.key) ?? []} />
          ))}
        </div>
        <DragOverlay>{activeApp && <div className="w-72"><KanbanCard app={activeApp} /></div>}</DragOverlay>
      </DndContext>
    </div>
  );
}
