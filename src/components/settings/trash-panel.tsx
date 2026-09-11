"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { restoreApplication, purgeApplication, purgeTrash } from "@/lib/actions/applications";

export type TrashedApplication = {
  id: string;
  title: string;
  companyName: string;
  deletedAt: Date | null;
};

export function TrashPanel({ items }: { items: TrashedApplication[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Corbeille</CardTitle>
        <CardDescription>Les opportunités supprimées restent récupérables ici tant que tu ne les effaces pas définitivement.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-foreground">
              {item.companyName} — {item.title}
              {item.deletedAt && <span className="ml-2 text-xs text-muted-foreground">supprimée le {new Date(item.deletedAt).toLocaleDateString("fr-FR")}</span>}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => { await restoreApplication(item.id); toast.success("Opportunité restaurée"); router.refresh(); })}>
                <RotateCcw className="size-3.5" /> Restaurer
              </Button>
              <Button size="icon" variant="ghost" disabled={pending} aria-label="Supprimer définitivement" onClick={() => startTransition(async () => { await purgeApplication(item.id); router.refresh(); })}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        <div className="flex justify-end pt-1">
          <Button
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              if (!confirm("Vider la corbeille ? Cette action est irréversible.")) return;
              startTransition(async () => {
                await purgeTrash();
                toast.success("Corbeille vidée");
                router.refresh();
              });
            }}
          >
            Vider la corbeille
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
