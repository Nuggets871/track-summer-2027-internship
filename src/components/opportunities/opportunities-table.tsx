"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { PipelineStage } from "@prisma/client";
import { ArrowUpDown } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { updateApplicationStatus } from "@/lib/actions/applications";
import { filterApplications, sortApplications, type ApplicationSortKey } from "@/lib/filters";
import type { ApplicationWithRelations } from "@/lib/data/applications";
import { formatDate } from "@/lib/utils";
import { matchLabel } from "@/lib/constants";

const QUICK_FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "match80", label: "Match > 80%" },
  { key: "match70", label: "Match > 70%" },
  { key: "deadline", label: "Deadline proche" },
  { key: "unscored", label: "Non analysées" },
] as const;

type QuickFilterKey = (typeof QUICK_FILTERS)[number]["key"];

function matchColor(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-success-foreground";
  if (score >= 40) return "text-warning-foreground";
  return "text-danger-foreground";
}

export function OpportunitiesTable({
  opportunities,
  stages,
}: {
  opportunities: ApplicationWithRelations[];
  stages: PipelineStage[];
}) {
  const [search, setSearch] = useState("");
  const [statusId, setStatusId] = useState<string>("ALL");
  const [quickFilter, setQuickFilter] = useState<QuickFilterKey>("all");
  const [sort, setSort] = useState<ApplicationSortKey>("match");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let rows = filterApplications(opportunities, {
      search,
      statusIds: statusId === "ALL" ? undefined : [statusId],
      minMatch: quickFilter === "match80" ? 80 : quickFilter === "match70" ? 70 : undefined,
      needsAnalysis: quickFilter === "unscored" ? true : undefined,
      deadlineWithinDays: quickFilter === "deadline" ? 14 : undefined,
    });
    rows = sortApplications(rows, sort);
    return rows;
  }, [opportunities, search, statusId, quickFilter, sort]);

  const toggleSort = (key: ApplicationSortKey) => setSort(key);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher une entreprise, un poste..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusId} onValueChange={setStatusId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={quickFilter === f.key ? "default" : "outline"}
              onClick={() => setQuickFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucune opportunité" description="Ajuste tes filtres ou ajoute une nouvelle offre via le lien ci-dessus." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => toggleSort("company")} className="cursor-pointer select-none">
                  <span className="inline-flex items-center gap-1">Entreprise <ArrowUpDown className="size-3" /></span>
                </TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead onClick={() => toggleSort("match")} className="cursor-pointer select-none">
                  <span className="inline-flex items-center gap-1">Match <ArrowUpDown className="size-3" /></span>
                </TableHead>
                <TableHead>Statut</TableHead>
                <TableHead onClick={() => toggleSort("deadline")} className="cursor-pointer select-none">
                  <span className="inline-flex items-center gap-1">Deadline <ArrowUpDown className="size-3" /></span>
                </TableHead>
                <TableHead>Prochaine action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id} className="group">
                  <TableCell>
                    <Link href={`/opportunities/${o.id}`} className="font-medium text-foreground hover:underline">
                      {o.company.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/opportunities/${o.id}`} className="text-muted-foreground group-hover:text-foreground">
                      {o.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[o.city?.name, o.country?.name].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {o.jobAnalysis?.matchScore != null ? (
                      <span className={`font-semibold tabular-nums ${matchColor(o.jobAnalysis.matchScore)}`} title={matchLabel(o.jobAnalysis.matchScore)}>
                        {o.jobAnalysis.matchScore}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Non analysée</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={o.statusId}
                      onValueChange={(next) => startTransition(() => updateApplicationStatus(o.id, next))}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <Badge dotColor={s.color} variant="outline" className="border-0 p-0">
                              {s.label}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.deadline ? formatDate(o.deadline) : "—"}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-muted-foreground">{o.nextAction || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
