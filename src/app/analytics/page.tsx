import { getDashboardStats, getFunnelStats, getPerformanceBreakdowns } from "@/lib/data/stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  WeeklyApplicationsChart,
  DistributionPie,
  HorizontalBarChart,
  FunnelBars,
  StatCard,
} from "@/components/analytics/analytics-charts";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const [stats, funnel, breakdowns] = await Promise.all([getDashboardStats(), getFunnelStats(), getPerformanceBreakdowns()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">La vue chiffrée de votre recherche de stage.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Candidatures envoyées" value={stats.sent} />
        <StatCard label="Taux de réponse" value={`${stats.responseRate}%`} />
        <StatCard label="Taux d'entretien" value={`${stats.interviewRate}%`} />
        <StatCard label="Taux de conversion (offer)" value={`${stats.conversionRate}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Candidatures par semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyApplicationsChart data={stats.weeklySeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funnel de conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelBars steps={funnel.map((f) => ({ stage: f.stage, value: f.value }))} />
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
            <CardTitle>Performance par pays</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={breakdowns.byCountry.map((c) => ({ name: `${c.name} (${c.responseRate}%)`, count: c.total }))} label="Candidatures" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance par secteur</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={breakdowns.bySector.map((c) => ({ name: `${c.name} (${c.responseRate}%)`, count: c.total }))} label="Candidatures" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance par source</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={breakdowns.bySource.map((c) => ({ name: `${c.name} (${c.responseRate}%)`, count: c.total }))} label="Candidatures" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Networking vs candidature classique</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={breakdowns.byNetworkingVsDirect.map((c) => ({ name: `${c.name} (${c.responseRate}%)`, count: c.total }))} label="Candidatures" />
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-subtle-foreground">
        Les pourcentages entre parenthèses indiquent le taux de réponse pour ce segment.
      </p>
    </div>
  );
}
