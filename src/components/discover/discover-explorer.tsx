"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Sparkles, Bookmark, Trash2, Bell, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmptyState } from "@/components/ui/empty-state";
import { DiscoverFiltersPopover, type FilterOptions } from "@/components/discover/discover-filters-popover";
import { DiscoverSections } from "@/components/discover/discover-sections";
import { DiscoverJobCard } from "@/components/discover/discover-job-card";
import { DiscoverJobDetailDialog } from "@/components/discover/discover-job-detail-dialog";
import { searchListingsAction } from "@/lib/actions/discover-search";
import { parseNlSearchQuery } from "@/lib/actions/discover";
import { createSavedSearch, deleteSavedSearch, createJobWatch, deleteJobWatch } from "@/lib/actions/discover";
import type { DiscoverFilters, DiscoverSort, DiscoverListingRow } from "@/lib/data/discover";
import type { SavedSearch, JobWatch } from "@prisma/client";

const QUICK_FILTERS: { key: string; label: string; apply: (f: DiscoverFilters) => DiscoverFilters }[] = [
  { key: "all", label: "Toutes", apply: (f) => ({ ...f, minMatch: undefined, postedWithinDays: undefined, visaSponsorshipOnly: undefined, savedOnly: undefined }) },
  { key: "match80", label: "Match > 80%", apply: (f) => ({ ...f, minMatch: 80 }) },
  { key: "match70", label: "Match > 70%", apply: (f) => ({ ...f, minMatch: 70 }) },
  { key: "week", label: "Posted this week", apply: (f) => ({ ...f, postedWithinDays: 7 }) },
  { key: "visa", label: "Visa friendly", apply: (f) => ({ ...f, visaSponsorshipOnly: true }) },
  { key: "remote", label: "Remote", apply: (f) => ({ ...f, remoteTypes: ["REMOTE"] }) },
  { key: "saved", label: "Saved", apply: (f) => ({ ...f, savedOnly: true }) },
];

const SORT_OPTIONS: { value: DiscoverSort; label: string }[] = [
  { value: "match", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "deadline", label: "Deadline" },
  { value: "salary", label: "Salary" },
  { value: "company", label: "Company" },
];

type Sections = {
  recommended: DiscoverListingRow[];
  newThisWeek: DiscoverListingRow[];
  closingSoon: DiscoverListingRow[];
  visaFriendly: DiscoverListingRow[];
};

export function DiscoverExplorer({
  filterOptions,
  sections,
  initialSavedSearches,
  initialWatches,
  aiConfigured,
  totalListingsCount,
}: {
  filterOptions: FilterOptions;
  sections: Sections;
  initialSavedSearches: SavedSearch[];
  initialWatches: JobWatch[];
  aiConfigured: boolean;
  totalListingsCount: number;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<DiscoverFilters>({});
  const [sort, setSort] = useState<DiscoverSort>("match");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<DiscoverListingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [openListingId, setOpenListingId] = useState<string | null>(null);
  const [nlPending, startNlTransition] = useTransition();
  const [pending, startTransition] = useTransition();
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [savedSearches, setSavedSearches] = useState(initialSavedSearches);
  const [watches, setWatches] = useState(initialWatches);
  const [watchKeyword, setWatchKeyword] = useState("");

  const activeFilterCount = useMemo(
    () =>
      (filters.countries?.length ?? 0) +
      (filters.cities?.length ?? 0) +
      (filters.sectors?.length ?? 0) +
      (filters.remoteTypes?.length ?? 0) +
      (filters.sourceIds?.length ?? 0) +
      (filters.visaSponsorshipOnly ? 1 : 0) +
      (filters.includeAllRoles ? 1 : 0),
    [filters],
  );

  const isIdle = !searched && !query && activeFilterCount === 0;

  const runSearch = useCallback(
    (nextFilters: DiscoverFilters, nextSort: DiscoverSort, nextPage: number, nextQuery: string) => {
      startTransition(async () => {
        const result = await searchListingsAction({ ...nextFilters, query: nextQuery || undefined }, nextSort, nextPage);
        setItems((prev) => (nextPage === 0 ? result.items : [...prev, ...result.items]));
        setTotal(result.total);
        setHasMore(result.hasMore);
      });
    },
    [],
  );

  useEffect(() => {
    if (isIdle) return;
    const timeout = setTimeout(() => {
      setPage(0);
      setSearched(true);
      runSearch(filters, sort, 0, query);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters, sort]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    runSearch(filters, sort, nextPage, query);
  };

  const runNlSearch = () => {
    if (!query.trim()) return;
    startNlTransition(async () => {
      const parsed = await parseNlSearchQuery(query);
      if (!parsed) {
        toast.error("L'IA n'a pas pu interpréter cette recherche (clé DeepSeek non configurée ou erreur).");
        return;
      }
      setFilters((prev) => ({
        ...prev,
        countries: parsed.countries.length ? parsed.countries : prev.countries,
        cities: parsed.cities.length ? parsed.cities : prev.cities,
        remoteTypes: parsed.remoteType ? [parsed.remoteType] : prev.remoteTypes,
      }));
      setQuery([...parsed.keywords, parsed.period].filter(Boolean).join(" "));
      toast.success("Recherche interprétée par l'IA");
    });
  };

  const saveCurrentSearch = () => {
    if (!searchName.trim()) return;
    startTransition(async () => {
      const created = await createSavedSearch({ name: searchName.trim(), query, filters, sort });
      setSavedSearches((prev) => [created, ...prev]);
      setSaveSearchOpen(false);
      setSearchName("");
      toast.success("Recherche sauvegardée");
    });
  };

  const applySavedSearch = (search: SavedSearch) => {
    setQuery(search.query ?? "");
    setFilters(JSON.parse(search.filters));
    setSort(search.sort as DiscoverSort);
    setSearched(true);
  };

  const removeSavedSearch = (id: string) => {
    startTransition(async () => {
      await deleteSavedSearch(id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    });
  };

  const addWatch = () => {
    if (!watchKeyword.trim()) return;
    startTransition(async () => {
      const watch = await createJobWatch({ keyword: watchKeyword.trim() });
      setWatches((prev) => [watch, ...prev]);
      setWatchKeyword("");
      toast.success("Suivi ajouté");
    });
  };

  const removeWatch = (id: string) => {
    startTransition(async () => {
      await deleteJobWatch(id);
      setWatches((prev) => prev.filter((w) => w.id !== id));
    });
  };

  const activeQuickFilter = QUICK_FILTERS.find((qf) => {
    if (qf.key === "all") return activeFilterCount === 0 && !filters.minMatch && !filters.postedWithinDays;
    if (qf.key === "match80") return filters.minMatch === 80;
    if (qf.key === "match70") return filters.minMatch === 70;
    if (qf.key === "week") return filters.postedWithinDays === 7;
    if (qf.key === "visa") return !!filters.visaSponsorshipOnly;
    if (qf.key === "remote") return filters.remoteTypes?.length === 1 && filters.remoteTypes[0] === "REMOTE";
    if (qf.key === "saved") return !!filters.savedOnly;
    return false;
  })?.key;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search internships, companies, skills, countries..."
              className="pl-9"
            />
          </div>
          {aiConfigured && (
            <Button variant="outline" size="sm" onClick={runNlSearch} disabled={nlPending || !query.trim()}>
              <Sparkles className="size-3.5" /> Interpréter avec l&apos;IA
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setSaveSearchOpen(true)}>
            <Bookmark className="size-3.5" /> Save search
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {QUICK_FILTERS.map((qf) => (
            <Button
              key={qf.key}
              size="sm"
              variant={activeQuickFilter === qf.key ? "default" : "outline"}
              onClick={() => setFilters((prev) => qf.apply(qf.key === "all" ? {} : prev))}
            >
              {qf.label}
            </Button>
          ))}
          <DiscoverFiltersPopover filters={filters} onChange={setFilters} options={filterOptions} activeCount={activeFilterCount} />
          <Select value={sort} onValueChange={(v) => setSort(v as DiscoverSort)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Bell className="size-3.5" /> Watchlist {watches.length > 0 && `(${watches.length})`}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <div className="flex flex-col gap-2">
                <div className="flex gap-1.5">
                  <Input value={watchKeyword} onChange={(e) => setWatchKeyword(e.target.value)} placeholder="Mot-clé à suivre..." className="h-8 text-sm" />
                  <Button size="sm" onClick={addWatch} disabled={pending}>
                    <Plus className="size-3.5" />
                  </Button>
                </div>
                {watches.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun suivi. Ajoute un mot-clé pour être alerté des nouvelles offres correspondantes.</p>
                ) : (
                  watches.map((w) => (
                    <div key={w.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{[w.keyword, w.countryName, w.cityName, w.sector].filter(Boolean).join(" · ")}</span>
                      <button onClick={() => removeWatch(w.id)} className="text-muted-foreground hover:text-danger">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {savedSearches.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Recherches sauvegardées :</span>
            {savedSearches.map((s) => (
              <Badge key={s.id} variant="outline" className="cursor-pointer gap-1.5 py-1 pl-2.5 pr-1.5 hover:border-primary/50">
                <span onClick={() => applySavedSearch(s)}>{s.name}</span>
                <button onClick={() => removeSavedSearch(s.id)} className="text-muted-foreground hover:text-danger">
                  <Trash2 className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {isIdle ? (
        <DiscoverSections sections={sections} onOpen={setOpenListingId} isEmpty={totalListingsCount === 0} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {pending && page === 0 ? "Recherche..." : `${total} opportunité${total > 1 ? "s" : ""} trouvée${total > 1 ? "s" : ""}`}
          </p>
          {items.length === 0 && !pending ? (
            <EmptyState title="Aucun résultat" description="Essaie d'autres mots-clés ou élargis tes filtres." />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <DiscoverJobCard key={item.id} listing={item} onOpen={setOpenListingId} />
                ))}
              </div>
              {hasMore && (
                <Button variant="outline" onClick={loadMore} disabled={pending} className="self-center">
                  Charger plus
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <DiscoverJobDetailDialog listingId={openListingId} onClose={() => setOpenListingId(null)} />

      <Dialog open={saveSearchOpen} onOpenChange={setSaveSearchOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Sauvegarder cette recherche</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-2">
            <Input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="Ex : London Finance" />
          </DialogBody>
          <DialogFooter className="pb-5">
            <Button variant="outline" onClick={() => setSaveSearchOpen(false)}>
              Annuler
            </Button>
            <Button onClick={saveCurrentSearch} disabled={!searchName.trim()}>
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
