"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Sparkles, Bookmark, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchScoreCard } from "@/components/job-import/match-score-card";
import { getListingDetailAction } from "@/lib/actions/discover-search";
import { convertListingToOpportunity, analyzeListingWithAi } from "@/lib/actions/discover";
import { formatDate } from "@/lib/utils";

type ListingDetail = NonNullable<Awaited<ReturnType<typeof getListingDetailAction>>>;

const REMOTE_LABELS: Record<string, string> = { REMOTE: "Remote", HYBRID: "Hybride", ONSITE: "Sur site" };

export function DiscoverJobDetailDialog({ listingId, onClose }: { listingId: string | null; onClose: () => void }) {
  const router = useRouter();
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [pending, startTransition] = useTransition();
  const loading = !!listingId && detail?.id !== listingId;

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    getListingDetailAction(listingId).then((fresh) => {
      if (!cancelled) setDetail(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const save = (action: "SAVE_LATER" | "ALREADY_APPLIED" | "PREPARE") => {
    if (!listingId) return;
    startTransition(async () => {
      const application = await convertListingToOpportunity(listingId, action);
      toast.success(
        action === "ALREADY_APPLIED" ? "Candidature enregistrée comme envoyée" : action === "PREPARE" ? "Opportunité sauvegardée" : "Opportunité sauvegardée pour plus tard",
      );
      onClose();
      router.push(`/opportunities/${application.id}`);
    });
  };

  const analyze = () => {
    if (!listingId) return;
    startTransition(async () => {
      try {
        await analyzeListingWithAi(listingId);
        const fresh = await getListingDetailAction(listingId);
        setDetail(fresh);
        toast.success("Analyse IA terminée — champs complétés et score recalculé");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <Dialog open={!!listingId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>{loading || !detail ? "Chargement..." : `${detail.title} — ${detail.companyName}`}</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5 pb-6">
          {detail && detail.id === listingId && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {[detail.cityName, detail.countryName].filter(Boolean).join(", ") && (
                    <span>{[detail.cityName, detail.countryName].filter(Boolean).join(", ")}</span>
                  )}
                  {detail.remoteType && <Badge variant="outline">{REMOTE_LABELS[detail.remoteType] ?? detail.remoteType}</Badge>}
                  {detail.postedAt && <span>Publiée le {formatDate(detail.postedAt)}</span>}
                  {detail.salaryAmount && (
                    <span>
                      {detail.salaryAmount} {detail.salaryCurrency}
                    </span>
                  )}
                  <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="size-3.5" /> Voir l&apos;offre originale
                  </a>
                </div>
                {detail.duplicates.length > 0 && (
                  <Badge variant="outline" className="text-primary">
                    Trouvée sur {detail.duplicates.length + 1} sources
                  </Badge>
                )}
              </div>

              {detail.tagsList.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detail.tagsList.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}

              {detail.requiredSkillsList.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Compétences demandées</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.requiredSkillsList.map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {detail.requiredLanguagesList.length > 0 && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Langues demandées</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.requiredLanguagesList.map((l) => (
                      <Badge key={l} variant="outline">
                        {l}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {detail.description && (
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h4>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{detail.description}</p>
                </div>
              )}

              <div className="border-t border-border pt-4">
                {detail.matchScore != null ? (
                  <MatchScoreCard
                    match={{
                      total: detail.matchScore,
                      factors: detail.matchBreakdownList,
                      strengths: detail.strengthsList,
                      watchouts: detail.watchoutsList,
                      missingSkills: detail.missingSkillsList,
                      recommendation: detail.recommendation ?? "",
                    }}
                    eligibility={{ status: detail.eligibilityStatus ?? "UNCLEAR", notes: detail.eligibilityNotesList }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Pas encore de score calculé pour cette offre.</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <Button size="sm" disabled={pending} onClick={() => save("PREPARE")}>
                  <ClipboardCheck className="size-3.5" /> Prepare application
                </Button>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => save("SAVE_LATER")}>
                  <Bookmark className="size-3.5" /> Save opportunity
                </Button>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => save("ALREADY_APPLIED")}>
                  <CheckCircle2 className="size-3.5" /> Already applied
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={analyze}>
                  <Sparkles className="size-3.5" /> Analyze with AI
                </Button>
              </div>
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
