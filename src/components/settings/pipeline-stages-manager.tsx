"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { createPipelineStage, updatePipelineStage, deletePipelineStage } from "@/lib/actions/pipeline-stages";
import type { PipelineStage } from "@prisma/client";

export function PipelineStagesManager({ stages }: { stages: PipelineStage[] }) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [pending, startTransition] = useTransition();
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  const add = () => {
    if (!label.trim()) return;
    startTransition(async () => {
      await createPipelineStage({ label, color, kind: "APPLICATION" });
      setLabel("");
      toast.success("Statut ajouté");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statuts de candidature personnalisés</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {sorted.map((s) => (
            <div key={s.id} className="flex items-center gap-2 rounded-md border border-border p-2">
              <input
                type="color"
                value={s.color}
                className="size-6 cursor-pointer rounded border-0 bg-transparent"
                onChange={(e) => startTransition(async () => { await updatePipelineStage(s.id, { color: e.target.value }); })}
              />
              <span className="flex-1 text-sm text-foreground">{s.label}</span>
              {s.isSystem ? (
                <Lock className="size-3.5 text-subtle-foreground" />
              ) : (
                <Select onValueChange={(fallback) => startTransition(async () => { await deletePipelineStage(s.id, fallback); toast.success("Statut supprimé"); })}>
                  <SelectTrigger className="w-8 border-0 bg-transparent p-0 [&>svg]:hidden">
                    <Trash2 className="size-3.5 text-muted-foreground hover:text-danger" />
                  </SelectTrigger>
                  <SelectContent>
                    {sorted
                      .filter((o) => o.id !== s.id)
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          Déplacer vers {o.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="size-8 cursor-pointer rounded border-0 bg-transparent" />
          <Input placeholder="Nouveau statut..." value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Button size="sm" onClick={add} disabled={pending}>
            <Plus /> Ajouter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
