"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { useUIStore } from "@/store/ui-store";
import { JobImportWidget } from "@/components/job-import/job-import-widget";
import { SpontaneousApplicationForm } from "@/components/opportunities/spontaneous-application-form";

export function QuickAddDialog() {
  const open = useUIStore((s) => s.addOpportunityOpen);
  const close = useUIStore((s) => s.closeAddOpportunity);
  const mode = useUIStore((s) => s.addOpportunityMode);
  const title = mode === "spontaneous" ? "Candidature spontanée" : mode === "description" ? "Analyser une description" : "Ajouter une opportunité";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="pb-5">
          {mode === "spontaneous" ? (
            <SpontaneousApplicationForm onDone={close} />
          ) : (
            <JobImportWidget key={mode} presentation="inline" initialMode={mode} onDone={close} />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
