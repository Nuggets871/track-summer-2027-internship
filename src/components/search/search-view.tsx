"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Sparkles, ExternalLink, Plus, MapPin, Building2, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { runJobSearch, addSearchResultToInbox } from "@/lib/actions/search";
import type { ProviderStatus } from "@/lib/search/types";
import type { SearchResultDto } from "@/lib/search/run";
import { cn } from "@/lib/utils";

function scoreColor(score: number | null) {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-success-foreground";
  if (score >= 40) return "text-warning-foreground";
  return "text-danger-foreground";
}

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
  const [keywords, setKeywords] = useState(defaultKeywords);
  const [countryCode, setCountryCode] = useState(suggestedCountryCode ?? countries[0]?.code ?? "gb");
  const [remote, setRemote] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saving, startSaving] = useTransition();
  const [results, setResults] = useState<SearchResultDto[]>([]);
  const [providerCounts, setProviderCounts] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);

  const search = () => {
    const country = countries.find((c) => c.code === countryCode);
    startTransition(async () => {
      try {
        const output = await runJobSearch({ keywords, countryName: country?.name ?? null, countryCode, remote });
        setResults(output.results);
        setProviderCounts(output.providerCounts);
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

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Mots-clés</label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
            </div>
            <div className="sm:w-56">
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
            <Button onClick={search} disabled={pending}>
              <Search className="size-4" /> {pending ? "Recherche…" : "Rechercher"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">Sources :</span>
            {providers.map((provider) => (
              <Badge key={provider.id} variant={provider.configured ? "success" : "outline"} title={provider.configured ? undefined : `Définis ${provider.envVars.join(", ")} dans .env`}>
                {provider.label}
                {!provider.configured && provider.requiresKey && ` — clé ${provider.envVars[0]} absente`}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {searched && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>
            {results.length} résultat{results.length > 1 ? "s" : ""}
            {Object.entries(providerCounts).length > 0 && ` · ${Object.entries(providerCounts).map(([id, n]) => `${id}:${n}`).join("  ")}`}
          </span>
          {errors.length > 0 && <span className="text-danger-foreground">{errors.join(" · ")}</span>}
        </div>
      )}

      {!searched ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState icon={Sparkles} title="Lance ta première recherche" description="Les critères sont pré-remplis depuis ton profil. Modifie-les puis clique sur Rechercher." />
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState title="Aucun résultat" description="Essaie d'autres mots-clés, une autre destination, ou active une source supplémentaire dans .env." />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((result) => (
            <Card key={result.id}>
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{result.title}</p>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
