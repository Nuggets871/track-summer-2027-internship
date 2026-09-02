"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { updateNetworkingStage } from "@/lib/actions/contacts";
import { NETWORKING_STAGES, CONTACT_TYPES, labelFor } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ContactWithRelations } from "@/lib/data/contacts";

function ContactCard({ contact }: { contact: ContactWithRelations }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: contact.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(isDragging && "z-10 opacity-70")}>
      <Card className="cursor-grab p-2.5 active:cursor-grabbing">
        <Link href={`/contacts/${contact.id}`} onClick={(e) => isDragging && e.preventDefault()} className="flex items-center gap-2">
          <Avatar name={`${contact.firstName} ${contact.lastName}`} size={26} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {contact.firstName} {contact.lastName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{contact.company?.name ?? labelFor(CONTACT_TYPES, contact.contactType)}</p>
          </div>
        </Link>
      </Card>
    </div>
  );
}

function StageColumn({ stage, contacts }: { stage: (typeof NETWORKING_STAGES)[number]; contacts: ContactWithRelations[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  return (
    <div ref={setNodeRef} className={cn("flex w-56 shrink-0 flex-col gap-2 rounded-lg border border-border bg-surface-muted/40 p-2.5", isOver && "border-primary/50 bg-primary-soft/40")}>
      <div className="flex items-center gap-2 px-1">
        <span className="size-2 rounded-full" style={{ backgroundColor: stage.color }} />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage.label}</h3>
        <span className="ml-auto text-xs text-subtle-foreground">{contacts.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {contacts.map((c) => (
          <ContactCard key={c.id} contact={c} />
        ))}
      </div>
    </div>
  );
}

export function NetworkingBoard({ contacts }: { contacts: ContactWithRelations[] }) {
  const [, startTransition] = useTransition();
  const [localContacts, setLocalContacts] = useState(contacts);
  const [activeId, setActiveId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ContactWithRelations[]>();
    for (const s of NETWORKING_STAGES) map.set(s.key, []);
    for (const c of localContacts) {
      const stage = c.networkingStage ?? "IDENTIFIED";
      if (map.has(stage)) map.get(stage)!.push(c);
    }
    return map;
  }, [localContacts]);

  const active = localContacts.find((c) => c.id === activeId);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active: activeDrag, over } = e;
    if (!over) return;
    const contactId = activeDrag.id as string;
    const stage = over.id as string;
    setLocalContacts((prev) => prev.map((c) => (c.id === contactId ? { ...c, networkingStage: stage } : c)));
    startTransition(async () => {
      await updateNetworkingStage(contactId, stage);
    });
  };

  const metrics = [
    { label: "Demandes envoyées", value: localContacts.filter((c) => c.linkedinRequestSent).length },
    { label: "Demandes acceptées", value: localContacts.filter((c) => c.linkedinAccepted).length },
    { label: "Calls obtenus", value: localContacts.filter((c) => c.networkingStage === "CALL" || c.networkingStage === "ACTIVE_RELATION" || c.networkingStage === "REFERRAL").length },
    { label: "Referrals obtenus", value: localContacts.filter((c) => c.referralObtained || c.networkingStage === "REFERRAL").length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardHeader>
              <CardTitle className="text-xs text-muted-foreground">{m.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-foreground">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DndContext onDragStart={(e) => setActiveId(e.active.id as string)} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-3">
          {NETWORKING_STAGES.map((stage) => (
            <StageColumn key={stage.key} stage={stage} contacts={grouped.get(stage.key) ?? []} />
          ))}
        </div>
        <DragOverlay>{active && <div className="w-56"><ContactCard contact={active} /></div>}</DragOverlay>
      </DndContext>

      <Badge variant="outline" className="w-fit">
        Astuce : glissez une carte vers une autre colonne pour mettre à jour son étape.
      </Badge>
    </div>
  );
}
