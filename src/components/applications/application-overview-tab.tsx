import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OfferQuickCard } from "@/components/applications/offer-quick-card";
import { CoverLetterQuickCard } from "@/components/applications/cover-letter-quick-card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ApplicationDetail } from "@/components/applications/types";
import type { ScoreResult } from "@/lib/scoring";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export function ApplicationOverviewTab({ application, priorityScore }: { application: ApplicationDetail; priorityScore: ScoreResult }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Détails</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
          <div>
            <InfoRow label="Secteur" value={application.sector ?? "—"} />
            <InfoRow label="Équipe" value={application.department ?? "—"} />
            <InfoRow label="Source" value={application.source ?? "—"} />
            <InfoRow label="Remote possible" value={application.remotePossible ? "Oui" : "Non"} />
            <InfoRow label="Langue demandée" value={application.languageRequired ?? "—"} />
          </div>
          <div>
            <InfoRow label="Date de découverte" value={formatDate(application.discoveredAt)} />
            <InfoRow label="Date de candidature" value={formatDate(application.appliedAt)} />
            <InfoRow label="Deadline" value={formatDate(application.deadline)} />
            <InfoRow label="Début potentiel" value={formatDate(application.potentialStartDate)} />
            <InfoRow label="Durée" value={application.durationMonths ? `${application.durationMonths} mois` : "—"} />
          </div>
          <div>
            <InfoRow label="Salaire" value={formatCurrency(application.salaryAmount, application.salaryCurrency ?? "EUR")} />
            <InfoRow label="Logement fourni" value={application.housingProvided ? "Oui" : application.housingProvided === false ? "Non" : "—"} />
            <InfoRow label="Visa nécessaire" value={application.visaRequired ? "Oui" : application.visaRequired === false ? "Non" : "—"} />
            <InfoRow label="Sponsorship possible" value={application.sponsorshipPossible ? "Oui" : application.sponsorshipPossible === false ? "Non" : "—"} />
          </div>
          <div>
            <InfoRow label="Prochaine action" value={application.nextAction ?? "—"} />
            <InfoRow label="Date de l'action" value={formatDate(application.nextActionDate)} />
            <InfoRow label="Nombre de relances" value={application.followUpCount} />
            <InfoRow label="Dernière interaction" value={formatDate(application.lastInteractionAt)} />
          </div>
        </CardContent>
        {application.notes && (
          <CardContent className="border-t border-border">
            <p className="text-sm text-muted-foreground">{application.notes}</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Score de priorité</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tabular-nums text-foreground">{priorityScore.total}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <Progress value={priorityScore.total} />
          {priorityScore.factors.length === 0 ? (
            <p className="text-xs text-muted-foreground">Candidature clôturée — score non applicable.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              {priorityScore.factors.map((f) => (
                <li key={f.key}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex cursor-default justify-between">
                        <span>
                          {f.label} <span className="text-subtle-foreground">×{f.weight}</span>
                        </span>
                        <span className="tabular-nums">{Math.round(f.value)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Contribution au score : {f.contribution.toFixed(1)}</TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <OfferQuickCard applicationId={application.id} companyId={application.companyId} offer={application.offer} />
      </div>
      <div>
        <CoverLetterQuickCard applicationId={application.id} companyId={application.companyId} coverLetter={application.coverLetter} />
      </div>
    </div>
  );
}
