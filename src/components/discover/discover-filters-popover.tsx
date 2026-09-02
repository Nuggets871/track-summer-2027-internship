"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DiscoverFilters } from "@/lib/data/discover";

const REMOTE_OPTIONS = [
  { value: "ONSITE", label: "Sur site" },
  { value: "HYBRID", label: "Hybride" },
  { value: "REMOTE", label: "Remote" },
];

export type FilterOptions = { countries: string[]; cities: string[]; sectors: string[]; sources: { id: string; name: string }[] };

export function DiscoverFiltersPopover({
  filters,
  onChange,
  options,
  activeCount,
}: {
  filters: DiscoverFilters;
  onChange: (next: DiscoverFilters) => void;
  options: FilterOptions;
  activeCount: number;
}) {
  const toggle = (key: "countries" | "cities" | "sectors" | "sourceIds", value: string) => {
    const current: string[] = filters[key] ?? [];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    onChange({ ...filters, [key]: next.length ? next : undefined });
  };

  const toggleRemote = (value: string) => {
    const current = filters.remoteTypes ?? [];
    const next = (current.includes(value as never) ? current.filter((v) => v !== value) : [...current, value]) as DiscoverFilters["remoteTypes"];
    onChange({ ...filters, remoteTypes: next && next.length ? next : undefined });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="size-3.5" /> Filtres {activeCount > 0 && `(${activeCount})`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <ScrollArea className="max-h-[70vh]">
          <div className="flex flex-col gap-4 pr-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Modalité</p>
              <div className="flex flex-wrap gap-2">
                {REMOTE_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-sm">
                    <Checkbox checked={(filters.remoteTypes ?? []).includes(o.value as never)} onCheckedChange={() => toggleRemote(o.value)} />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            {options.countries.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pays</p>
                <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                  {options.countries.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={(filters.countries ?? []).includes(c)} onCheckedChange={() => toggle("countries", c)} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {options.cities.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ville</p>
                <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                  {options.cities.map((c) => (
                    <label key={c} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={(filters.cities ?? []).includes(c)} onCheckedChange={() => toggle("cities", c)} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {options.sectors.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secteur</p>
                <div className="flex flex-col gap-1">
                  {options.sectors.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={(filters.sectors ?? []).includes(s)} onCheckedChange={() => toggle("sectors", s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {options.sources.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</p>
                <div className="flex flex-col gap-1">
                  {options.sources.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={(filters.sourceIds ?? []).includes(s.id)} onCheckedChange={() => toggle("sourceIds", s.id)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Visa/sponsorship uniquement</span>
              <Switch checked={!!filters.visaSponsorshipOnly} onCheckedChange={(v) => onChange({ ...filters, visaSponsorshipOnly: v || undefined })} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Inclure tous les postes (pas seulement stages)</span>
              <Switch checked={!!filters.includeAllRoles} onCheckedChange={(v) => onChange({ ...filters, includeAllRoles: v || undefined })} />
            </div>

            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => onChange({})}>
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
