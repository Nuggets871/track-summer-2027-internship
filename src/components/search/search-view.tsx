"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Sparkles, ExternalLink, Plus, MapPin, Building2, CalendarClock, RefreshCw, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { runJobSearch, addSearchResultToInbox, dismissDiscoveredJob } from "@/lib/actions/search";
import type { ProviderStatus } from "@/lib/search/types";
import type { ProviderRunStatus, SearchResultDto } from "@/lib/search/run";
import { cn } from "@/lib/utils";

function scoreColor(score: number | null) {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-success-foreground";
  if (score >= 40) return "text-warning-foreground";
  return "text-danger-foreground";
}

const STATUS_LABEL: Record<ProviderRunStatus["status"], string> = {
  ok: "interrogée",
  cache: "cache",
  quota: "quota atteint",
  error: "erreur",
  skipped: "ignorée",
};

export function SearchView({
  providers,
  defaultKeywords,
  countries,
  suggestedCountryCode,
}: {
  providers: ProviderStatus[];
  defaultKeywords: string;
  countries: { name: string; code: string }[];
  suggestedCountryCode: string | null;
}) {
  const configured = providers.filter((p) => p.configured);  const defaultSelection = configured.filter((p) => p.id === "ats" || p.id === "adzuna").map((p) => p.id);

  const [keywords, setKeywords] = useState(defaultKeywords);
  const [countryCode, setCountryCode] = useState(suggestedCountryCode ?? countries[0]?.code ?? "gb");
  const [remote, setRemote] = useState(false);
  const [selected, setSelected] = useState<string[]>(defaultSelection.length ? defaultSelection : configured.map((p) => p.id));
  const [force, setForce] = useState(false);
  const [newOnly, setNewOnly] = useState(true);
  const [pending, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();
  const [results, setResults] = useState<SearchResultDto[]>([]);
  const [statuses, setStatuses] = useState<ProviderRunStatus[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);

  const visible = useMemo(
    () => results.filter((r) => !r.dismissed && (!newOnly || r.isNew)),
    [results, newOnly],
  );
  const newCount = results.filter((r) => r.isNew && !r.dismissed).length;

  const search = () => {
    const country = countries.find((c) => c.code === countryCode);
    startTransition(async () => {
      try {
        const output = await runJobSearch({ keywords, countryName: country?.name ?? null, countryCode, remote, providerIds: selected, force });
        setResults(output.results);
        setStatuses(output.providerStatus);
        setErrors(output.errors);
        setSearched(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Recherche impossible");
      }
    });
  };

  const save = (result: SearchResultDto) => {
    startSaving(async () => {
      try {
        await addSearchResultToInbox({ url: result.url, company: result.company, title: result.title });
        toast.success("Ajouté aux pistes");
      } catch {
        toast.error("Ajout impossible");
      }
    });
  };

  const dismiss = (result: SearchResultDto) => {
    setResults((prev) => prev.map((r) => (r.canonicalUrl === result.canonicalUrl ? { ...r, dismissed: true } : r)));
    startSaving(async () => {
      try {
        await dismissDiscoveredJob(result.canonicalUrl, true);
      } catch {
        toast.error("Impossible de masquer");
      }
    });
  };

  const toggleProvider = (id: string, checked: boolean) =>
    setSelected((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((value) => value !== id)));

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Mots-clés</label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
            </div>
            <div className="sm:w-52">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Destination</label>
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={remote} onCheckedChange={setRemote} />
              <span className="text-sm text-foreground">Remote</span>
            </div>
            <Button onClick={search} disabled={pending || selected.length === 0}>
              <Search className="size-4" /> {pending ? "Recherche…" : "Rechercher"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
            <span className="text-xs font-medium text-muted-foreground">Sources :</span>
            {providers.map((provider) => (
              <label key={provider.id} className={cn("flex items-center gap-2 text-sm", !provider.configured && "opacity-50")}>
                <Checkbox
                  checked={selected.includes(provider.id)}
                  disabled={!provider.configured}
                  onCheckedChange={(value) => toggleProvider(provider.id, !!value)}
                />
                <span className="text-foreground">{provider.label}</span>
                {!provider.configured && provider.requiresKey && (
                  <span className="text-xs text-muted-foreground">({provider.envVars[0]} absent)</span>
                )}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={force} onCheckedChange={setForce} />
              <span className="inline-flex items-center gap-1 text-foreground"><RefreshCw className="size-3.5" /> Forcer</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={newOnly} onCheckedChange={setNewOnly} />
              <span className="text-foreground">Nouveaux seulement</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {searched && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            {visible.length} affichée{visible.length > 1 ? "s" : ""} · {newCount} nouvelle{newCount > 1 ? "s" : ""} sur {results.length}
          </span>
          {statuses.map((status) => (
            <span key={status.id} className={status.status === "quota" || status.status === "error" ? "text-danger-foreground" : ""}>
              {status.label} : {status.count} ({STATUS_LABEL[status.status]}{status.remaining != null ? ` · ${status.remaining} restants` : ""})
            </span>
          ))}
          {errors.length > 0 && <span className="text-danger-foreground">{errors.join(" · ")}</span>}
        </div>
      )}

      {!searched ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState icon={Sparkles} title="Lance ta première recherche" description="Les critères sont pré-remplis depuis ton profil. Choisis tes sources puis clique sur Rechercher." />
          </CardContent>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              title={newOnly ? "Aucune nouveauté" : "Aucun résultat"}
              description={newOnly ? "Désactive « Nouveaux seulement » pour revoir les offres déjà trouvées." : "Essaie d'autres mots-clés, une autre destination, ou active une source."}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((result) => (
            <Card key={result.canonicalUrl}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-semibold text-foreground">
                      {result.isNew && <Badge variant="success">Nouveau</Badge>}
                      {result.title}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Building2 className="size-3" /> {result.company}</span>
                      {(result.city || result.country) && (
                        <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {[result.city, result.country].filter(Boolean).join(", ")}</span>
                      )}
                      {result.remoteType === "REMOTE" && <Badge variant="outline">Remote</Badge>}
                      {result.postedAt && <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" /> {new Date(result.postedAt).toLocaleDateString("fr-FR")}</span>}
                      {result.salaryAmount && <span>{Math.round(result.salaryAmount).toLocaleString("fr-FR")} {result.salaryCurrency ?? ""}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{result.source}</Badge>
                    {result.matchScore != null && (
                      <span className={cn("text-sm font-semibold tabular-nums", scoreColor(result.matchScore))} title={result.matchLabel}>
                        {result.matchScore}%
                      </span>
                    )}
                  </div>
                </div>
                {result.description && <p className="line-clamp-2 text-xs text-muted-foreground">{result.description}</p>}
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" asChild>
                    <a href={result.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" /> Voir l&apos;offre
                    </a>
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => save(result)} disabled={saving}>
                    <Plus className="size-3.5" /> Ajouter aux pistes
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dismiss(result)} disabled={saving}>
                    <X className="size-3.5" /> Masquer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
