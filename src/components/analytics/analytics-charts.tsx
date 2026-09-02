"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const PALETTE = ["#6366f1", "#22c55e", "#f97316", "#0ea5e9", "#eab308", "#ec4899", "#14b8a6", "#a855f7"];

const chartTooltipStyle = {
  backgroundColor: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-foreground)",
};

export function WeeklyApplicationsChart({ data }: { data: { week: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "var(--color-surface-hover)" }} />
        <Bar dataKey="count" name="Candidatures" fill={PALETTE[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DistributionPie({ data }: { data: { name: string; count: number; color?: string }[] }) {
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Pas encore de données.</p>;
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <ResponsiveContainer width="100%" height={200} className="sm:max-w-[200px]">
        <PieChart>
          <Pie data={sorted} dataKey="count" nameKey="name" innerRadius={44} outerRadius={80} paddingAngle={2}>
            {sorted.map((entry, i) => (
              <Cell key={entry.name} fill={entry.color ?? PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={chartTooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto sm:max-h-48">
        {sorted.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color ?? PALETTE[i % PALETTE.length] }} />
            <span className="flex-1 truncate text-muted-foreground">{entry.name}</span>
            <span className="tabular-nums text-foreground">{entry.count}</span>
            <span className="w-9 shrink-0 text-right tabular-nums text-subtle-foreground">
              {total > 0 ? Math.round((entry.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBarChart({ data, dataKey = "count", label }: { data: { name: string; count: number }[]; dataKey?: string; label: string }) {
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Pas encore de données.</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "var(--color-surface-hover)" }} />
        <Bar dataKey={dataKey} name={label} fill={PALETTE[0]} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelBars({ steps }: { steps: { stage: string; value: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((step, i) => {
        const pct = (step.value / max) * 100;
        const prevValue = i > 0 ? steps[i - 1].value : step.value;
        const conversion = prevValue > 0 ? Math.round((step.value / prevValue) * 100) : 100;
        return (
          <div key={step.stage} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-xs text-muted-foreground">{step.stage}</span>
            <div className="h-6 flex-1 rounded-md bg-surface-muted">
              <div
                className={cn("flex h-full items-center justify-end rounded-md px-2 text-xs font-medium text-white transition-all")}
                style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
              >
                {step.value}
              </div>
            </div>
            {i > 0 && <span className="w-12 shrink-0 text-right text-xs text-subtle-foreground">{conversion}%</span>}
          </div>
        );
      })}
    </div>
  );
}

export function StatCard({ label, value, sublabel }: { label: string; value: string | number; sublabel?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
      </CardContent>
    </Card>
  );
}
