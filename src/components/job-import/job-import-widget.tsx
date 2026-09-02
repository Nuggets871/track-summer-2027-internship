"use client";

import { LinkIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  JobImportEntryStep,
  JobImportAnalyzingStep,
  JobImportPasteFallbackStep,
  JobImportReviewStep,
} from "@/components/job-import/job-import-flow";
import { useJobImportFlow } from "@/components/job-import/use-job-import-flow";
import type { ReferenceData } from "@/lib/data/reference";

const STEP_TITLES: Record<string, string> = {
  analyzing: "Analyse en cours",
  paste_fallback: "Coller la description",
  review: "Voici ce que nous avons détecté",
  already_applied: "Candidature déjà envoyée",
};

/**
 * The "Add by link" workflow: paste a job URL, get it fetched, extracted,
 * scored against your profile, and reviewed before anything is saved.
 *
 * `presentation="dialog"` (Dashboard, Applications page): the input bar is
 * always visible inline; once analysis starts, the rest of the flow opens in
 * a dialog.
 * `presentation="inline"` (quick-add dialog): the whole flow renders in
 * place, since it's already inside a dialog and nesting two would be poor UX.
 */
export function JobImportWidget({
  presentation = "dialog",
  reference,
  onDone,
}: {
  presentation?: "dialog" | "inline";
  reference: ReferenceData;
  onDone?: (applicationId: string) => void;
}) {
  const flow = useJobImportFlow(onDone);

  const content = (
    <>
      {flow.step === "analyzing" && <JobImportAnalyzingStep />}
      {flow.step === "paste_fallback" && <JobImportPasteFallbackStep flow={flow} />}
      {(flow.step === "review" || flow.step === "already_applied") && (
        <JobImportReviewStep flow={flow} reference={reference} />
      )}
    </>
  );

  if (presentation === "inline") {
    return (
      <div className="flex flex-col gap-4">
        <JobImportEntryStep flow={flow} />
        {flow.step !== "idle" && content}
      </div>
    );
  }

  return (
    <>
      <Card className="flex flex-col gap-3 border-dashed p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <LinkIcon className="size-4 text-primary" />
          Coller le lien d&apos;une offre
        </div>
        <JobImportEntryStep flow={flow} />
      </Card>

      <Dialog open={flow.step !== "idle"} onOpenChange={(open) => !open && flow.reset()}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>{STEP_TITLES[flow.step] ?? ""}</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">{content}</DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
