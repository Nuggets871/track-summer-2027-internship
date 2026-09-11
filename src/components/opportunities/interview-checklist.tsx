"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ListChecks, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { saveInterviewChecklist } from "@/lib/actions/interview";

export type ChecklistItem = { id: string; label: string; done: boolean };

export function InterviewChecklist({ applicationId, initialItems }: { applicationId: string; initialItems: ChecklistItem[] }) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();

  const persist = (next: ChecklistItem[]) => {
    setItems(next);
    startTransition(async () => {
      try {
        await saveInterviewChecklist(applicationId, next);
      } catch {
        toast.error("Sauvegarde impossible");
      }
    });
  };

  const add = () => {
    const value = label.trim();
    if (!value) return;
    persist([...items, { id: crypto.randomUUID(), label: value, done: false }]);
    setLabel("");
  };

  const done = items.filter((item) => item.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="size-4 text-primary" /> Checklist d&apos;entretien
        </CardTitle>
        <CardDescription>
          Prépare ce qui compte : questions à réviser, points à anticiper, démarches. {items.length > 0 && `${done}/${items.length} fait${done > 1 ? "s" : ""}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-1.5">
                <Checkbox checked={item.done} onCheckedChange={(value) => persist(items.map((i) => (i.id === item.id ? { ...i, done: !!value } : i)))} />
                <span className={cn("min-w-0 flex-1 text-sm", item.done ? "text-muted-foreground line-through" : "text-foreground")}>{item.label}</span>
                <Button size="icon" variant="ghost" aria-label="Retirer" onClick={() => persist(items.filter((i) => i.id !== item.id))}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Ex : préparer 3 questions sur le produit"
          />
          <Button size="sm" onClick={add} disabled={pending || !label.trim()}>
            <Plus className="size-3.5" /> Ajouter
          </Button>
        </div>
        {items.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5" /> Astuce : reprends les « points faibles à anticiper » générés par l&apos;IA.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
