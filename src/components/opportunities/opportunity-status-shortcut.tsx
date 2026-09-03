"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markApplicationAsSent } from "@/lib/actions/applications";

/**
 * A single dedicated action, at the very bottom of the opportunity page, for
 * the most common status change: once a candidature is ready ("En
 * préparation"), going to "Envoyée" shouldn't require hunting for the small
 * status dropdown up in the header. Hidden entirely once it no longer
 * applies (any other status).
 */
export function OpportunityStatusShortcut({ applicationId, statusKey }: { applicationId: string; statusKey: string }) {
  const [pending, startTransition] = useTransition();

  if (statusKey !== "PREPARING") return null;

  const markAsSent = () => {
    startTransition(async () => {
      await markApplicationAsSent(applicationId);
      toast.success("Candidature marquée comme envoyée");
    });
  };

  return (
    <div className="flex justify-center border-t border-border pt-6">
      <Button size="lg" onClick={markAsSent} disabled={pending}>
        <Send className="size-4" /> Marquer comme envoyée
      </Button>
    </div>
  );
}
