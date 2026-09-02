"use client";

import { useState, useTransition } from "react";
import { Pin, PinOff, Trash2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createNote, togglePinNote, deleteNote } from "@/lib/actions/notes";
import { formatDateTime, cn } from "@/lib/utils";
import type { Note } from "@prisma/client";
import type { ReferenceData } from "@/lib/data/reference";

export function NotesPanel({
  notes,
  applicationId,
  companyId,
  contactId,
}: {
  notes: Note[];
  applicationId?: string;
  companyId?: string;
  contactId?: string;
  reference?: ReferenceData;
}) {
  const [content, setContent] = useState("");
  const [pending, startTransition] = useTransition();

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const submit = () => {
    if (!content.trim()) return;
    startTransition(async () => {
      await createNote({ title: null, content, pinned: false, applicationId: applicationId ?? null, companyId: companyId ?? null, contactId: contactId ?? null, countryId: null });
      setContent("");
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <Textarea
          rows={3}
          placeholder="Ajouter une note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={pending || !content.trim()}>
            Ajouter la note
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={StickyNote} title="Aucune note pour le moment" />
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((note) => (
            <Card key={note.id} className={cn("p-3", note.pinned && "border-primary/40 bg-primary-soft/40")}>
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-sm text-foreground">{note.content}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => startTransition(async () => { await togglePinNote(note.id); })}
                  >
                    {note.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  </button>
                  <button
                    className="text-muted-foreground hover:text-danger"
                    onClick={() => startTransition(async () => { await deleteNote(note.id); })}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-xs text-subtle-foreground">{formatDateTime(note.createdAt)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
