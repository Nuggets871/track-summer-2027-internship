"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { useUIStore } from "@/store/ui-store";
import { JobImportWidget } from "@/components/job-import/job-import-widget";

export function QuickAddDialog() {
  const open = useUIStore((s) => s.addOpportunityOpen);
  const close = useUIStore((s) => s.closeAddOpportunity);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Ajouter une opportunité</DialogTitle>
        </DialogHeader>
        <DialogBody className="pb-5">
          <JobImportWidget presentation="inline" onDone={close} />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
