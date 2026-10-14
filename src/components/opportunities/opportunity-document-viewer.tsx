"use client";

import { useState } from "react";
import { Download, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ViewerDocument = {
  kind: "cv" | "letter";
  url: string;
  downloadUrl: string;
  title: string;
  description: string;
};

/**
 * Inline viewer for the tailored CV and cover letter of an application. The two
 * buttons live in the opportunities table and open the generated PDF in a
 * modal, without leaving the dashboard.
 */
export function OpportunityDocumentViewer({
  applicationId,
  hasCv,
  hasLetter,
  className,
}: {
  applicationId: string;
  hasCv: boolean;
  hasLetter: boolean;
  className?: string;
}) {
  const [document, setDocument] = useState<ViewerDocument | null>(null);

  const open = (kind: ViewerDocument["kind"]) => {
    if (kind === "cv") {
      setDocument({
        kind,
        url: `/api/cv/${applicationId}/pdf?inline=1`,
        downloadUrl: `/api/cv/${applicationId}/pdf`,
        title: "CV adapté",
        description: "Version personnalisée du CV pour cette opportunité.",
      });
    } else {
      setDocument({
        kind,
        url: `/api/cover-letter/${applicationId}/pdf?inline=1`,
        downloadUrl: `/api/cover-letter/${applicationId}/pdf`,
        title: "Lettre de motivation",
        description: "Lettre générée pour cette opportunité.",
      });
    }
  };

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={!hasCv}
                aria-label={hasCv ? "Voir le CV" : "Aucun CV généré"}
                onClick={() => open("cv")}
              >
                <FileText className="size-3.5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{hasCv ? "Voir le CV" : "Aucun CV généré"}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                size="icon-sm"
                variant="ghost"
                disabled={!hasLetter}
                aria-label={hasLetter ? "Voir la lettre de motivation" : "Aucune lettre générée"}
                onClick={() => open("letter")}
              >
                <Mail className="size-3.5" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{hasLetter ? "Voir la lettre de motivation" : "Aucune lettre générée"}</TooltipContent>
        </Tooltip>
      </div>

      <Dialog open={document !== null} onOpenChange={(next) => { if (!next) setDocument(null); }}>
        <DialogContent
          size="xl"
          className="flex h-[88vh] max-h-[88vh] w-[min(1100px,95vw)] max-w-none flex-col gap-0 overflow-hidden p-0"
        >
          <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-border pb-3 pr-12">
            <div className="flex min-w-0 flex-col gap-1">
              <DialogTitle>{document?.title}</DialogTitle>
              <DialogDescription className="truncate">{document?.description}</DialogDescription>
            </div>
            {document && (
              <Button asChild size="sm" variant="outline">
                <a href={document.downloadUrl} rel="noopener">
                  <Download className="size-3.5" /> Télécharger
                </a>
              </Button>
            )}
          </DialogHeader>
          {document && (
            <iframe
              key={document.kind}
              src={document.url}
              title={document.title}
              className="min-h-0 w-full flex-1 bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
