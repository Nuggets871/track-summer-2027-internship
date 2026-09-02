"use client";

import { useState } from "react";
import { ApplicationForm } from "@/components/forms/application-form";
import { JobImportWidget } from "@/components/job-import/job-import-widget";
import type { ReferenceData } from "@/lib/data/reference";

export function QuickAddApplicationPanel({ reference, onSuccess }: { reference: ReferenceData; onSuccess: () => void }) {
  const [manual, setManual] = useState(false);

  if (manual) {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => setManual(false)} className="self-start text-xs text-primary hover:underline">
          ← Coller un lien d&apos;offre à la place
        </button>
        <ApplicationForm reference={reference} onSuccess={onSuccess} compact />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <JobImportWidget presentation="inline" reference={reference} onDone={onSuccess} />
      <button onClick={() => setManual(true)} className="self-start text-xs text-muted-foreground hover:text-foreground hover:underline">
        Ou créer une candidature manuellement →
      </button>
    </div>
  );
}
