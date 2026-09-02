import Link from "next/link";
import { getDashboardStats } from "@/lib/data/stats";
import { getSmartAlerts } from "@/lib/data/notifications";
import { getReferenceData } from "@/lib/data/reference";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WeeklyApplicationsChart, DistributionPie, StatCard } from "@/components/analytics/analytics-charts";
import { formatDate, daysUntil, cn } from "@/lib/utils";

export default async function DashboardPage() {
  const [stats, alerts, reference] = await Promise.all([getDashboardStats(), getSmartAlerts(), getReferenceData()]);
  const userName = reference.settings?.userName;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {userName ? `Bonjour ${userName} 👋` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground">Vue d&apos;ensemble de votre recherche de stage été 2027.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatCard label="Opportunités" value={stats.total} />
        <StatCard label="Envoyées" value={stats.sent} />
        <StatCard label="À préparer" value={stats.toPrepare} />
        <StatCard label="Réponses" value={stats.responses} />
        <StatCard label="Refus" value={stats.refused} />
        <StatCard label="Entretiens" value={stats.interviews} />
        <StatCard label="Offers" value={stats.offers} />
        <StatCard label="À relancer" value={stats.needsFollowUp} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Candidatures par semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyApplicationsChart data={stats.weeklySeries} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionPie data={stats.byStatus} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>À faire aujourd&apos;hui</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Rien à signaler, bonne journée ! 🎉</p>
            ) : (
              alerts.slice(0, 6).map((a) => (
                <Link key={a.id} href={a.href} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm hover:border-border-strong">
                  <span
                    className={cn(
                      "flex-1",
                      a.severity === "critical" && "font-medium text-danger",
                      a.severity === "warning" && "text-warning",
                    )}
                  >
                    {a.message}
                  </span>
                </Link>
              ))
            )}
            <Link href="/today" className="mt-1 text-xs font-medium text-primary hover:underline">
              Voir toutes les actions →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deadlines à venir</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {stats.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune deadline en vue.</p>
            ) : (
              stats.upcomingDeadlines.map((a) => {
                const d = daysUntil(a.deadline);
                return (
                  <Link key={a.id} href={`/applications/${a.id}`} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm hover:border-border-strong">
                    <span>
                      {a.company.name} — {a.title}
                    </span>
                    <Badge variant={d !== null && d <= 3 ? "danger" : "outline"}>{formatDate(a.deadline)}</Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par pays</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionPie data={stats.byCountry} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Entreprises les plus prometteuses</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {stats.topCompanies.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{c.name}</span>
                <span className="text-xs text-muted-foreground">Fit {c.score}/100 · {c.count} candidature{c.count > 1 ? "s" : ""}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {reference.stages.map((s) => {
              const count = stats.byStatus.find((b) => b.name === s.label)?.count ?? 0;
              return (
                <Link
                  key={s.id}
                  href="/kanban"
                  className="flex min-w-32 flex-col items-center gap-1 rounded-md border border-border p-3 hover:border-border-strong"
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                  <span className="text-lg font-semibold tabular-nums text-foreground">{count}</span>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
