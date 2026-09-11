import Link from "next/link";
import { ArrowUpRight, Sparkles, ClipboardList, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getOpportunities } from "@/lib/data/applications";
import { getSmartAlerts } from "@/lib/data/notifications";
import { getProfile, isProfileMinimallyComplete } from "@/lib/data/profile";
import { isAiConfigured } from "@/lib/ai/provider";
import { TERMINAL_STAGE_KEYS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/home/onboarding-checklist";

export default async function HomePage() {
  const [opportunities, alerts, profile, aiConfigured] = await Promise.all([
    getOpportunities(),
    getSmartAlerts(),
    getProfile(),
    isAiConfigured(),
  ]);

  const analyzed = opportunities.filter((o) => o.jobAnalysis?.matchScore != null);
  const topMatches = [...analyzed]
    .sort((a, b) => (b.jobAnalysis!.matchScore ?? 0) - (a.jobAnalysis!.matchScore ?? 0))
    .slice(0, 4);

  const active = opportunities
    .filter((o) => !TERMINAL_STAGE_KEYS.includes(o.status.key))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bonjour 👋</h1>
        <p className="text-sm text-muted-foreground">Retrouve les opportunités qui méritent ton attention et leur prochaine action.</p>
      </div>

      <OnboardingChecklist
        steps={[
          { label: "Compléter ton profil (formation, compétences)", href: "/profile", done: isProfileMinimallyComplete(profile) },
          { label: "Ajouter ton CV", href: "/profile", done: !!profile.cvRawText },
          { label: "Importer ta lettre de motivation de référence", href: "/profile", done: !!profile.coverLetterReference },
          { label: "Ajouter ta première offre", href: "/opportunities", done: opportunities.length > 0 },
          { label: "Configurer l'IA (optionnel)", href: "/settings", done: aiConfigured },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" /> Meilleurs matches
            </CardTitle>
            <CardDescription>Les offres où ton profil colle le mieux, tous statuts confondus.</CardDescription>
          </CardHeader>
          <CardContent>
            {topMatches.length === 0 ? (
              <EmptyState
                title="Aucune analyse pour l'instant"
                description="Utilise le bouton Ajouter pour analyser ta première offre."
              />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {topMatches.map((o) => (
                  <Link
                    key={o.id}
                    href={`/opportunities/${o.id}`}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{o.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.company.name}
                        {o.country ? ` · ${o.country.name}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" style={{ borderColor: o.status.color, color: o.status.color }}>
                        {o.status.label}
                      </Badge>
                      <span className="w-12 text-right text-sm font-semibold tabular-nums text-foreground">
                        {o.jobAnalysis!.matchScore}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4 text-primary" /> Actions à faire
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <EmptyState title="Tout est à jour" description="Aucune deadline ni relance en attente." />
            ) : (
              <div className="flex flex-col gap-2">
                {alerts.slice(0, 6).map((a) => (
                  <Link
                    key={a.id}
                    href={a.href}
                    className="flex items-start gap-2 rounded-md p-1.5 text-sm hover:bg-surface-muted/60"
                  >
                    <span
                      className={
                        "mt-1.5 size-1.5 shrink-0 rounded-full " +
                        (a.severity === "critical" ? "bg-danger" : a.severity === "warning" ? "bg-warning" : "bg-muted-foreground")
                      }
                    />
                    <span className="text-foreground">{a.message}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="size-4 text-primary" /> Candidatures actives
            </CardTitle>
            <CardDescription>Tout ce qui n&apos;est ni classé, ni refusé, ni terminé.</CardDescription>
          </div>
          <Link href="/opportunities" className="flex items-center gap-1 text-sm text-primary hover:underline">
            Voir tout <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <EmptyState title="Aucune candidature active" description="Sauvegarde ou postule à une offre pour la voir apparaître ici." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {active.map((o) => (
                <Link
                  key={o.id}
                  href={`/opportunities/${o.id}`}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 hover:opacity-80"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {o.company.name} <span className="font-normal text-muted-foreground">— {o.title}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    {o.deadline && <span>Deadline {formatDate(o.deadline)}</span>}
                    <Badge variant="outline" style={{ borderColor: o.status.color, color: o.status.color }}>
                      {o.status.label}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
