"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { PipelineStage } from "@prisma/client";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { OpportunityDocumentViewer } from "@/components/opportunities/opportunity-document-viewer";
import { updateApplicationStatus } from "@/lib/actions/applications";
import { filterApplications, sortApplications, type ApplicationSortKey } from "@/lib/filters";
import type { ApplicationWithRelations } from "@/lib/data/applications";
import { cn, formatDate } from "@/lib/utils";
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

/**
 * Compact dd/mm/yy date. The full "14 oct. 2026" wording is too wide to keep
 * the whole table visible on a laptop without horizontal scroll, so the tooltip
 * carries the long form.
 */
function shortDate(date: Date | string | null | undefined) {
  return formatDate(date, { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Column widths that keep every column on screen from `xl` up. */
const COLUMN_WIDTHS = {
  company: "xl:w-[11%]",
  title: "xl:w-[12%]",
  location: "xl:w-[10%]",
  match: "xl:w-[7.5%]",
  status: "xl:w-[12.5%]",
  deadline: "xl:w-[8.5%]",
  nextAction: "xl:w-[11.5%]",
  documents: "xl:w-[8%]",
  createdAt: "xl:w-[9%]",
  updatedAt: "xl:w-[10%]",
} as const;

/** "City, Country" with the empty pieces dropped, so the cell never shows ", ." */
function locationLabel(application: ApplicationWithRelations) {
  return [application.city?.name, application.country?.name].filter(Boolean).join(", ");
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
  const [dateField, setDateField] = useState<"createdAt" | "updatedAt">("updatedAt");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<ApplicationSortKey>("updatedAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    let rows = filterApplications(opportunities, {
      search,
      statusIds: statusId === "ALL" ? undefined : [statusId],
      minMatch: quickFilter === "match80" ? 80 : quickFilter === "match70" ? 70 : undefined,
      needsAnalysis: quickFilter === "unscored" ? true : undefined,
      deadlineWithinDays: quickFilter === "deadline" ? 14 : undefined,
      dateField,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    rows = sortApplications(rows, sort, direction);
    return rows;
  }, [opportunities, search, statusId, quickFilter, dateField, dateFrom, dateTo, sort, direction]);

  const toggleSort = (key: ApplicationSortKey) => {
    if (key === sort) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSort(key);
      setDirection(key === "company" || key === "deadline" ? "asc" : "desc");
    }
  };

  const renderSortIcon = (column: ApplicationSortKey) => {
    if (column !== sort) return <ArrowUpDown className="size-3" />;
    return direction === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />;
  };

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
        <Select value={dateField} onValueChange={(value) => setDateField(value as "createdAt" | "updatedAt")}>
          <SelectTrigger className="w-44" aria-label="Type de date">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">Dernière modif</SelectItem>
            <SelectItem value="createdAt">Date d&apos;ajout</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" aria-label="Depuis le" title="Depuis le" />
          <span className="text-xs text-muted-foreground">→</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" aria-label="Jusqu'au" title="Jusqu'au" />
          {(dateFrom || dateTo) && (
            <Button size="sm" variant="ghost" onClick={() => { setDateFrom(""); setDateTo(""); }}>
              Effacer
            </Button>
          )}
        </div>
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
          <Table className="xl:table-fixed xl:[&_td]:px-2 xl:[&_th]:px-2">
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => toggleSort("company")} className={cn("cursor-pointer select-none", COLUMN_WIDTHS.company)}>
                  <span className="inline-flex items-center gap-1">Entreprise {renderSortIcon("company")}</span>
                </TableHead>
                <TableHead className={COLUMN_WIDTHS.title}>Poste</TableHead>
                <TableHead className={COLUMN_WIDTHS.location}>Localisation</TableHead>
                <TableHead onClick={() => toggleSort("match")} className={cn("cursor-pointer select-none", COLUMN_WIDTHS.match)}>
                  <span className="inline-flex items-center gap-1">Match {renderSortIcon("match")}</span>
                </TableHead>
                <TableHead className={COLUMN_WIDTHS.status}>Statut</TableHead>
                <TableHead onClick={() => toggleSort("deadline")} className={cn("cursor-pointer select-none", COLUMN_WIDTHS.deadline)}>
                  <span className="inline-flex items-center gap-1">Deadline {renderSortIcon("deadline")}</span>
                </TableHead>
                <TableHead className={COLUMN_WIDTHS.nextAction}>Prochaine action</TableHead>
                <TableHead className={COLUMN_WIDTHS.documents}>Documents</TableHead>
                <TableHead onClick={() => toggleSort("createdAt")} className={cn("cursor-pointer select-none", COLUMN_WIDTHS.createdAt)}>
                  <span className="inline-flex items-center gap-1">Ajoutée {renderSortIcon("createdAt")}</span>
                </TableHead>
                <TableHead onClick={() => toggleSort("updatedAt")} className={cn("cursor-pointer select-none", COLUMN_WIDTHS.updatedAt)}>
                  <span className="inline-flex items-center gap-1">Modifiée {renderSortIcon("updatedAt")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.id} className="group">
                  <TableCell>
                    <Link
                      href={`/opportunities/${o.id}`}
                      title={o.company.name}
                      className="block truncate font-medium text-foreground hover:underline"
                    >
                      {o.company.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/opportunities/${o.id}`}
                      title={o.title}
                      className="block truncate text-muted-foreground group-hover:text-foreground"
                    >
                      {o.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="block truncate" title={locationLabel(o) || undefined}>
                      {locationLabel(o) || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {o.jobAnalysis?.matchScore != null ? (
                      <span className={`font-semibold tabular-nums ${matchColor(o.jobAnalysis.matchScore)}`} title={matchLabel(o.jobAnalysis.matchScore)}>
                        {o.jobAnalysis.matchScore}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground" title="Non analysée">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={o.statusId}
                      onValueChange={(next) => startTransition(() => updateApplicationStatus(o.id, next))}
                    >
                      <SelectTrigger className="h-7 w-36 text-xs xl:w-full xl:px-2" title={o.status.label}>
                        <SelectValue className="truncate" />
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
                  <TableCell className="whitespace-nowrap text-muted-foreground" title={o.deadline ? formatDate(o.deadline) : undefined}>
                    {shortDate(o.deadline)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="block max-w-[180px] truncate" title={o.nextAction || undefined}>
                      {o.nextAction || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <OpportunityDocumentViewer
                      applicationId={o.id}
                      hasCv={o.generatedCv != null}
                      hasLetter={o.coverLetter != null}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground" title={formatDate(o.createdAt)}>
                    {shortDate(o.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground" title={formatDate(o.updatedAt)}>
                    {shortDate(o.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
