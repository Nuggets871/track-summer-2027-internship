"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Download,
  Upload,
  MoreHorizontal,
  Trash2,
  Copy,
  ChevronDown,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { ApplicationForm } from "@/components/forms/application-form";
import { JobImportWidget } from "@/components/job-import/job-import-widget";
import { PRIORITY_LEVELS, ELIGIBILITY_STATUSES, labelFor, colorFor, matchLabel } from "@/lib/constants";
import { cn, formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { filterApplications, sortApplications, type ApplicationFilters, type ApplicationSortKey } from "@/lib/filters";
import {
  updateApplicationStatus,
  bulkDeleteApplications,
  bulkUpdateApplicationStatus,
  duplicateApplication,
  deleteApplication,
} from "@/lib/actions/applications";
import { exportApplicationsCsv, importApplicationsCsv } from "@/lib/actions/backup";
import type { ApplicationWithScore } from "@/lib/data/applications";
import type { ReferenceData } from "@/lib/data/reference";
import type { PipelineStage } from "@prisma/client";

const ALL_COLUMNS = [
  { key: "company", label: "Entreprise" },
  { key: "status", label: "Statut" },
  { key: "match", label: "Match" },
  { key: "priority", label: "Priorité" },
  { key: "location", label: "Localisation" },
  { key: "deadline", label: "Deadline" },
  { key: "nextAction", label: "Prochaine action" },
  { key: "score", label: "Score" },
  { key: "salary", label: "Salaire" },
  { key: "source", label: "Source" },
] as const;
type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

const QUICK_FILTERS: { key: string; label: string; filters: Partial<ApplicationFilters> }[] = [
  { key: "match80", label: "Match > 80%", filters: { minMatch: 80 } },
  { key: "match70", label: "Match > 70%", filters: { minMatch: 70 } },
  { key: "deadline", label: "Deadline proche", filters: { deadlineWithinDays: 14 } },
  { key: "toAnalyze", label: "À analyser", filters: { needsAnalysis: true } },
];

function matchScoreColor(score: number) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#f87171";
}

function DeadlineCell({ date }: { date: Date | null }) {
  if (!date) return <span className="text-subtle-foreground">—</span>;
  const d = daysUntil(date);
  const urgent = d !== null && d <= 3;
  const soon = d !== null && d <= 10;
  return (
    <span className={cn("text-sm", urgent ? "font-medium text-danger" : soon ? "text-warning" : "text-foreground")}>
      {formatDate(date)}
    </span>
  );
}

export function ApplicationsTable({
  applications,
  reference,
  stages,
}: {
  applications: ApplicationWithScore[];
  reference: ReferenceData;
  stages: PipelineStage[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<ApplicationSortKey>("updatedAt");
  const [columns, setColumns] = useState<ColumnKey[]>(ALL_COLUMNS.map((c) => c.key));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const activeQuickFilter = QUICK_FILTERS.find((f) => f.key === quickFilter)?.filters ?? {};
    const results = filterApplications(applications, {
      search,
      statusIds: statusFilter,
      countryIds: countryFilter,
      priorities: priorityFilter,
      ...activeQuickFilter,
    });
    return sortApplications(results, sort);
  }, [applications, search, statusFilter, countryFilter, priorityFilter, quickFilter, sort]);

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.has(a.id));
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(filtered.map((a) => a.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    startTransition(async () => {
      const csv = await exportApplicationsCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `candidatures-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export CSV téléchargé");
    });
  };

  const handleImportFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        startTransition(async () => {
          try {
            const count = await importApplicationsCsv(results.data);
            toast.success(`${count} candidature(s) importée(s)`);
          } catch {
            toast.error("Import échoué — vérifiez le format du fichier");
          }
        });
      },
    });
  };

  const bulkDelete = () => {
    if (!confirm(`Supprimer ${selected.size} candidature(s) ? Cette action est irréversible.`)) return;
    startTransition(async () => {
      await bulkDeleteApplications([...selected]);
      setSelected(new Set());
      toast.success("Candidatures supprimées");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <JobImportWidget reference={reference} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>

        {QUICK_FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={quickFilter === f.key ? "secondary" : "outline"}
            size="sm"
            onClick={() => setQuickFilter((prev) => (prev === f.key ? null : f.key))}
          >
            {f.label}
          </Button>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal /> Statut {statusFilter.length > 0 && `(${statusFilter.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-72 overflow-y-auto">
            {stages.map((s) => (
              <DropdownMenuCheckboxItem
                key={s.id}
                checked={statusFilter.includes(s.id)}
                onCheckedChange={(c) =>
                  setStatusFilter((prev) => (c ? [...prev, s.id] : prev.filter((id) => id !== s.id)))
                }
              >
                <span className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal /> Pays {countryFilter.length > 0 && `(${countryFilter.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-72 overflow-y-auto">
            {reference.countries.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={countryFilter.includes(c.id)}
                onCheckedChange={(checked) =>
                  setCountryFilter((prev) => (checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)))
                }
              >
                {c.name}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal /> Priorité {priorityFilter.length > 0 && `(${priorityFilter.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {PRIORITY_LEVELS.map((p) => (
              <DropdownMenuCheckboxItem
                key={p.value}
                checked={priorityFilter.includes(p.value)}
                onCheckedChange={(checked) =>
                  setPriorityFilter((prev) => (checked ? [...prev, p.value] : prev.filter((v) => v !== p.value)))
                }
              >
                {p.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDown /> Trier
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSort("updatedAt")}>Dernière modification</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("match")}>Meilleur match</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("deadline")}>Deadline</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("score")}>Score de priorité</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSort("company")}>Entreprise (A-Z)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Colonnes <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Colonnes visibles</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLUMNS.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.key}
                checked={columns.includes(c.key)}
                onCheckedChange={(checked) =>
                  setColumns((prev) => (checked ? [...prev, c.key] : prev.filter((k) => k !== c.key)))
                }
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
        />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={pending}>
          <Upload /> Importer
        </Button>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
          <Download /> Exporter
        </Button>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus /> Nouvelle candidature
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary-soft px-3 py-2 text-sm">
          <span className="font-medium text-primary-soft-foreground">{selected.size} sélectionnée(s)</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                Changer le statut
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {stages.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() =>
                    startTransition(async () => {
                      await bulkUpdateApplicationStatus([...selected], s.id);
                      setSelected(new Set());
                      toast.success("Statut mis à jour");
                    })
                  }
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="destructive" size="sm" onClick={bulkDelete}>
            <Trash2 /> Supprimer
          </Button>
          <button className="ml-auto text-xs text-muted-foreground hover:underline" onClick={() => setSelected(new Set())}>
            Désélectionner
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Aucune candidature ne correspond"
          description="Ajustez vos filtres ou créez une nouvelle candidature."
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus /> Nouvelle candidature
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                {columns.includes("company") && <TableHead>Entreprise & poste</TableHead>}
                {columns.includes("status") && <TableHead>Statut</TableHead>}
                {columns.includes("match") && <TableHead>Match</TableHead>}
                {columns.includes("priority") && <TableHead>Priorité</TableHead>}
                {columns.includes("location") && <TableHead>Localisation</TableHead>}
                {columns.includes("deadline") && <TableHead>Deadline</TableHead>}
                {columns.includes("nextAction") && <TableHead>Prochaine action</TableHead>}
                {columns.includes("score") && <TableHead>Score</TableHead>}
                {columns.includes("salary") && <TableHead>Salaire</TableHead>}
                {columns.includes("source") && <TableHead>Source</TableHead>}
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((app) => (
                <TableRow key={app.id} data-state={selected.has(app.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={selected.has(app.id)} onCheckedChange={() => toggleOne(app.id)} />
                  </TableCell>
                  {columns.includes("company") && (
                    <TableCell>
                      <Link href={`/applications/${app.id}`} className="flex items-center gap-2.5 hover:underline">
                        <Avatar name={app.company.name} src={app.company.logoUrl} size={28} />
                        <span className="flex flex-col">
                          <span className="font-medium text-foreground">{app.company.name}</span>
                          <span className="text-xs text-muted-foreground">{app.title}</span>
                        </span>
                      </Link>
                    </TableCell>
                  )}
                  {columns.includes("status") && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button>
                            <Badge dotColor={app.status.color} className="cursor-pointer">
                              {app.status.label}
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {stages.map((s) => (
                            <DropdownMenuItem
                              key={s.id}
                              onClick={() =>
                                startTransition(async () => {
                                  await updateApplicationStatus(app.id, s.id);
                                })
                              }
                            >
                              <span className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: s.color }} />
                              {s.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                  {columns.includes("match") && (
                    <TableCell>
                      {app.jobAnalysis?.matchScore != null ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <span
                                className="flex size-7 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                                style={{ backgroundColor: matchScoreColor(app.jobAnalysis.matchScore) }}
                              >
                                {app.jobAnalysis.matchScore}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{matchLabel(app.jobAnalysis.matchScore)}</p>
                            <p className="text-muted-foreground">
                              Eligibility : {labelFor(ELIGIBILITY_STATUSES, app.jobAnalysis.eligibilityStatus)}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-xs text-subtle-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {columns.includes("priority") && (
                    <TableCell>
                      <Badge dotColor={colorFor(PRIORITY_LEVELS, app.priority)}>{labelFor(PRIORITY_LEVELS, app.priority)}</Badge>
                    </TableCell>
                  )}
                  {columns.includes("location") && (
                    <TableCell className="text-sm text-muted-foreground">
                      {[app.city?.name, app.country?.name].filter(Boolean).join(", ") || "—"}
                      {app.remotePossible && <span className="ml-1 text-xs">(remote ok)</span>}
                    </TableCell>
                  )}
                  {columns.includes("deadline") && (
                    <TableCell>
                      <DeadlineCell date={app.deadline} />
                    </TableCell>
                  )}
                  {columns.includes("nextAction") && (
                    <TableCell className="max-w-48 truncate text-sm text-muted-foreground">
                      {app.nextAction ? `${app.nextAction}${app.nextActionDate ? ` · ${formatDate(app.nextActionDate)}` : ""}` : "—"}
                    </TableCell>
                  )}
                  {columns.includes("score") && (
                    <TableCell className="w-28">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2">
                            <Progress value={app.priorityScore.total} className="w-14" />
                            <span className="text-xs font-medium tabular-nums text-foreground">{app.priorityScore.total}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="w-56">
                          <p className="mb-1 font-medium">Calcul du score</p>
                          {app.priorityScore.factors.length === 0 ? (
                            <p className="text-muted-foreground">Candidature clôturée — score non applicable.</p>
                          ) : (
                            <ul className="space-y-0.5">
                              {app.priorityScore.factors.map((f) => (
                                <li key={f.key} className="flex justify-between gap-2">
                                  <span>{f.label}</span>
                                  <span className="tabular-nums">{Math.round(f.value)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  )}
                  {columns.includes("salary") && (
                    <TableCell className="text-sm text-muted-foreground">
                      {formatCurrency(app.salaryAmount, app.salaryCurrency ?? "EUR")}
                    </TableCell>
                  )}
                  {columns.includes("source") && (
                    <TableCell className="text-sm text-muted-foreground">{app.source ?? "—"}</TableCell>
                  )}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/applications/${app.id}`}>Ouvrir</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            startTransition(async () => {
                              await duplicateApplication(app.id);
                              toast.success("Candidature dupliquée");
                            })
                          }
                        >
                          <Copy className="size-4" /> Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            if (confirm("Supprimer cette candidature ?")) {
                              startTransition(async () => {
                                await deleteApplication(app.id);
                                toast.success("Candidature supprimée");
                              });
                            }
                          }}
                        >
                          <Trash2 className="size-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-subtle-foreground">
        {filtered.length} candidature{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""} sur {applications.length}
      </p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Nouvelle candidature</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <ApplicationForm reference={reference} onSuccess={() => setCreateOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
