"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { ApplicationForm } from "@/components/forms/application-form";
import { updateApplicationStatus, deleteApplication, recordFollowUp } from "@/lib/actions/applications";
import { PRIORITY_LEVELS, labelFor, colorFor } from "@/lib/constants";
import type { ReferenceData } from "@/lib/data/reference";
import type { ApplicationDetail } from "@/components/applications/types";
import type { PipelineStage } from "@prisma/client";

export function ApplicationHeader({
  application,
  reference,
  stages,
}: {
  application: ApplicationDetail;
  reference: ReferenceData;
  stages: PipelineStage[];
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={application.company.name} src={application.company.logoUrl} size={48} />
        <div>
          <h1 className="text-xl font-semibold text-foreground">{application.title}</h1>
          <p className="text-sm text-muted-foreground">
            {application.company.name}
            {application.country && ` · ${application.country.name}`}
          </p>
        </div>
        <Badge dotColor={colorFor(PRIORITY_LEVELS, application.priority)}>{labelFor(PRIORITY_LEVELS, application.priority)}</Badge>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button>
              <Badge dotColor={application.status.color} className="cursor-pointer px-3 py-1 text-sm">
                {application.status.label}
              </Badge>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {stages.map((s) => (
              <DropdownMenuItem key={s.id} onClick={() => startTransition(async () => { await updateApplicationStatus(application.id, s.id); })}>
                <span className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => startTransition(async () => { await recordFollowUp(application.id); toast.success("Relance enregistrée"); })}
        >
          <RefreshCw /> Relancer ({application.followUpCount})
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil /> Modifier
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm("Supprimer cette candidature ?")) {
              startTransition(async () => {
                await deleteApplication(application.id);
                router.push("/applications");
              });
            }
          }}
        >
          <Trash2 className="text-danger" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Modifier la candidature</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <ApplicationForm reference={reference} application={application} onSuccess={() => setEditOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
