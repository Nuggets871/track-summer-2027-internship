"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import type { PipelineStage, Application, Company, Country, City } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { updateApplicationStatus, deleteApplication } from "@/lib/actions/applications";
import { toast } from "sonner";

type Application_ = Application & { company: Company; country: Country | null; city: City | null; jobAnalysis?: { matchScore: number | null } | null };

export function OpportunityHeader({ application, stages }: { application: Application_; stages: PipelineStage[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const location = [application.city?.name, application.country?.name].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{application.title}</h1>
          <p className="text-sm text-muted-foreground">
            {application.company.name}
            {location ? ` · ${location}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {application.jobAnalysis?.matchScore != null && (
            <Badge variant="primary" className="text-sm">
              {application.jobAnalysis.matchScore}% match
            </Badge>
          )}
          <Select
            value={application.statusId}
            onValueChange={(next) => startTransition(() => updateApplicationStatus(application.id, next))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {application.jobUrl && (
          <a
            href={application.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" /> Voir l&apos;offre originale
          </a>
        )}
        <button
          className="flex items-center gap-1 text-muted-foreground hover:text-danger"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
        >
          <Trash2 className="size-3.5" /> Supprimer
        </button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Supprimer cette opportunité ?</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-2 text-sm text-muted-foreground">
            Cette action est définitive et supprimera aussi l&apos;analyse et la lettre de motivation associées.
          </DialogBody>
          <DialogFooter className="pb-5">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                startTransition(async () => {
                  await deleteApplication(application.id);
                  toast.success("Opportunité supprimée");
                  router.push("/opportunities");
                })
              }
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
