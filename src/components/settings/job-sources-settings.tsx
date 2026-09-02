"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, UploadCloud, CheckCircle2, XCircle, HelpCircle, KeyRound, Copy, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  addJobSource,
  updateJobSource,
  duplicateJobSource,
  toggleJobSource,
  deleteJobSource,
  syncOneSource,
  syncAllJobSources,
  importDiscoverCsv,
  importDiscoverJson,
} from "@/lib/actions/discover";
import { getJobSourcesAction, getJobSourceEditableConfigAction } from "@/lib/actions/discover-search";
import { SOURCE_TYPE_LABELS, API_KEY_SOURCE_TYPES } from "@/lib/discover/providers/registry";
import type { JobSourceSafe } from "@/lib/data/discover";

type SourceType = "GREENHOUSE" | "LEVER" | "RSS" | "JSON_ENDPOINT" | "CSV_URL" | "ADZUNA" | "JSEARCH" | "REED" | "JOOBLE";
type DialogMode = "add" | "edit" | null;

function StatusBadge({ status }: { status: string }) {
  if (status === "OK") return <Badge variant="success"><CheckCircle2 className="size-3" /> OK</Badge>;
  if (status === "ERROR") return <Badge variant="danger"><XCircle className="size-3" /> Erreur</Badge>;
  return <Badge variant="outline"><HelpCircle className="size-3" /> Inconnu</Badge>;
}

export function JobSourcesSettings({ sources: initialSources }: { sources: JobSourceSafe[] }) {
  const [sources, setSources] = useState(initialSources);
  const [pending, startTransition] = useTransition();

  const [mode, setMode] = useState<DialogMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<SourceType>("GREENHOUSE");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [appId, setAppId] = useState("");
  const [query, setQuery] = useState("internship");
  const [country, setCountry] = useState("gb");
  const [location, setLocation] = useState("");
  const csvFileRef = useRef<HTMLInputElement>(null);

  const isApiKeyType = API_KEY_SOURCE_TYPES.includes(type as never);

  const sync = (id: string) => {
    startTransition(async () => {
      const result = await syncOneSource(id);
      toast[result.ok ? "success" : "error"](result.message);
      setSources(await getJobSourcesAction());
    });
  };

  const syncAll = () => {
    startTransition(async () => {
      const results = await syncAllJobSources();
      const ok = results.filter((r) => r.ok).length;
      toast.success(`${ok}/${results.length} source(s) synchronisée(s)`);
      setSources(await getJobSourcesAction());
    });
  };

  const toggle = (id: string, enabled: boolean) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, enabled } : s)));
    startTransition(() => toggleJobSource(id, enabled));
  };

  const remove = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    startTransition(() => deleteJobSource(id));
  };

  const duplicate = (source: JobSourceSafe) => {
    startTransition(async () => {
      try {
        await duplicateJobSource(source.id);
        setSources(await getJobSourcesAction());
        toast.success("Source dupliquée et synchronisée — modifie-la pour ajuster la recherche.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible de dupliquer cette source");
      }
    });
  };

  const resetForm = () => {
    setName("");
    setToken("");
    setUrl("");
    setApiKey("");
    setAppId("");
    setQuery("internship");
    setCountry("gb");
    setLocation("");
  };

  const closeDialog = () => {
    setMode(null);
    setEditingId(null);
    resetForm();
  };

  const openAdd = () => {
    resetForm();
    setType("GREENHOUSE");
    setMode("add");
  };

  const openEdit = (source: JobSourceSafe) => {
    startTransition(async () => {
      const cfg = await getJobSourceEditableConfigAction(source.id);
      const c = cfg.config as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" ? v : "");
      resetForm();
      setType(cfg.type as SourceType);
      setName(cfg.name);
      if (cfg.type === "GREENHOUSE") setToken(str(c.boardToken));
      else if (cfg.type === "LEVER") setToken(str(c.companyToken));
      else if (cfg.type === "RSS") setUrl(str(c.feedUrl));
      else if (cfg.type === "JSON_ENDPOINT") setUrl(str(c.endpointUrl));
      else if (cfg.type === "CSV_URL") setUrl(str(c.csvUrl));
      else if (cfg.type === "ADZUNA") {
        setAppId(str(c.appId));
        setCountry(str(c.country) || "gb");
        setQuery(str(c.what) || "internship");
      } else if (cfg.type === "JSEARCH" || cfg.type === "REED") {
        setQuery(str(c.query ?? c.keywords) || "internship");
      } else if (cfg.type === "JOOBLE") {
        setQuery(str(c.keywords) || "internship");
        setLocation(str(c.location));
      }
      // Secret fields (appKey/apiKey) are never returned — left blank on
      // purpose, submitting the form unchanged keeps the saved key.
      setEditingId(source.id);
      setMode("edit");
    });
  };

  const buildConfig = (): Record<string, unknown> =>
    type === "GREENHOUSE" ? { boardToken: token, companyLabel: name }
    : type === "LEVER" ? { companyToken: token, companyLabel: name }
    : type === "RSS" ? { feedUrl: url, companyLabel: name }
    : type === "JSON_ENDPOINT" ? { endpointUrl: url }
    : type === "CSV_URL" ? { csvUrl: url }
    : type === "ADZUNA" ? { appId, appKey: apiKey, country, what: query }
    : type === "JSEARCH" ? { apiKey, query }
    : type === "REED" ? { apiKey, keywords: query }
    : { apiKey, keywords: query, location: location || undefined }; // JOOBLE

  const submit = () => {
    if (!name.trim()) {
      toast.error("Donne un nom à cette source.");
      return;
    }
    const config = buildConfig();

    startTransition(async () => {
      try {
        if (mode === "edit" && editingId) {
          await updateJobSource(editingId, { name: name.trim(), config });
          toast.success("Source mise à jour et resynchronisée");
        } else {
          await addJobSource({ type, name: name.trim(), config });
          toast.success("Source ajoutée et synchronisée");
        }
        setSources(await getJobSourcesAction());
        closeDialog();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement de cette source");
      }
    });
  };

  const [csvText, setCsvText] = useState("");
  const [jsonText, setJsonText] = useState("");

  const onCsvFile = (file: File | undefined) => {
    if (!file) return;
    file.text().then((text) => setCsvText(text));
  };

  const runCsvImport = () => {
    startTransition(async () => {
      try {
        const result = await importDiscoverCsv(csvText);
        toast.success(`${result.created} créée(s), ${result.updated} mise(s) à jour, ${result.duplicate} doublon(s), ${result.skipped} ignorée(s)`);
        setCsvText("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Import CSV impossible");
      }
    });
  };

  const runJsonImport = () => {
    startTransition(async () => {
      try {
        const result = await importDiscoverJson(jsonText);
        toast.success(`${result.created} créée(s), ${result.updated} mise(s) à jour, ${result.duplicate} doublon(s), ${result.skipped} ignorée(s)`);
        setJsonText("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Import JSON impossible");
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Sources d&apos;offres (Discover)</CardTitle>
            <CardDescription>
              Chaque source est réelle et vérifiée à l&apos;ajout. Greenhouse/Lever suivent une entreprise à la fois ; Adzuna/
              JSearch/Reed/Jooble sont de vraies recherches par mots-clés nécessitant ta propre clé API (voir le README pour
              l&apos;obtenir).
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={syncAll} disabled={pending || sources.length === 0}>
              <RefreshCw className="size-3.5" /> Sync all
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="size-3.5" /> Ajouter une source
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <EmptyState title="Aucune source configurée" description="Ajoute une entreprise (Greenhouse/Lever), une recherche par API (Adzuna, JSearch, Reed, Jooble), un flux RSS, ou un endpoint JSON pour commencer à peupler Discover." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {sources.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {SOURCE_TYPE_LABELS[s.type as keyof typeof SOURCE_TYPE_LABELS] ?? s.type} · {s.jobCount} offre(s)
                      {s.lastSyncedAt ? ` · sync ${new Date(s.lastSyncedAt).toLocaleString("fr-FR")}` : " · jamais synchronisée"}
                    </p>
                    {s.lastSyncError && <p className="text-xs text-danger-foreground">{s.lastSyncError}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={s.status} />
                    <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s.id, v)} />
                    <Button size="sm" variant="outline" onClick={() => sync(s.id)} disabled={pending}>
                      <RefreshCw className="size-3.5" /> Sync now
                    </Button>
                    <button className="text-muted-foreground hover:text-foreground" title="Modifier" onClick={() => openEdit(s)} disabled={pending}>
                      <Pencil className="size-4" />
                    </button>
                    <button className="text-muted-foreground hover:text-foreground" title="Dupliquer" onClick={() => duplicate(s)} disabled={pending}>
                      <Copy className="size-4" />
                    </button>
                    <button className="text-muted-foreground hover:text-danger" title="Supprimer" onClick={() => remove(s.id)}>
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import manuel</CardTitle>
          <CardDescription>Colle ou importe une liste d&apos;offres (CSV ou JSON) — normalisée, dédupliquée et scorée comme n&apos;importe quelle autre source.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="csv">
            <TabsList>
              <TabsTrigger value="csv">CSV</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Colonnes reconnues : Company, Role/Title, Location, URL, Description, Source, PostedAt.</p>
              <input ref={csvFileRef} type="file" accept=".csv" className="hidden" onChange={(e) => onCsvFile(e.target.files?.[0])} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => csvFileRef.current?.click()}>
                  <UploadCloud className="size-3.5" /> Charger un fichier .csv
                </Button>
              </div>
              <Textarea rows={6} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder="company,role,location,url&#10;Acme,Summer Intern,Paris,https://..." />
              <Button size="sm" onClick={runCsvImport} disabled={pending || !csvText.trim()} className="self-start">
                Importer
              </Button>
            </TabsContent>
            <TabsContent value="json" className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Un tableau JSON d&apos;objets (ou {"{ jobs: [...] }"}) avec des champs comme title/company/location/url/description.</p>
              <Textarea rows={6} value={jsonText} onChange={(e) => setJsonText(e.target.value)} placeholder='[{"title":"Summer Intern","company":"Acme","url":"https://..."}]' />
              <Button size="sm" onClick={runJsonImport} disabled={pending || !jsonText.trim()} className="self-start">
                Importer
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={mode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? "Modifier la source" : "Ajouter une source"}</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3 pb-2">
            {mode === "edit" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type de source</label>
                <p className="rounded-md border border-border bg-surface-muted/40 px-3 py-2 text-sm text-foreground">
                  {SOURCE_TYPE_LABELS[type]}
                </p>
                <p className="text-xs text-muted-foreground">Le type ne peut pas être changé — supprime la source et recrée-en une pour changer de type.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type de source</label>
                <Select value={type} onValueChange={(v) => setType(v as SourceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GREENHOUSE">Entreprise (Greenhouse)</SelectItem>
                    <SelectItem value="LEVER">Entreprise (Lever)</SelectItem>
                    <SelectItem value="ADZUNA">Adzuna — recherche par mots-clés (clé API)</SelectItem>
                    <SelectItem value="JSEARCH">JSearch / RapidAPI (clé API)</SelectItem>
                    <SelectItem value="REED">Reed.co.uk — UK (clé API)</SelectItem>
                    <SelectItem value="JOOBLE">Jooble (clé API)</SelectItem>
                    <SelectItem value="RSS">Flux RSS</SelectItem>
                    <SelectItem value="JSON_ENDPOINT">Endpoint JSON</SelectItem>
                    <SelectItem value="CSV_URL">CSV (URL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {isApiKeyType && (
              <p className="flex items-start gap-1.5 rounded-md border border-primary/30 bg-primary-soft/40 p-2.5 text-xs text-foreground">
                <KeyRound className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {mode === "edit"
                  ? "Le champ de clé ci-dessous est vide par sécurité (elle n'est jamais renvoyée à cette interface) — laisse-le vide pour conserver la clé déjà enregistrée, ou saisis-en une nouvelle pour la remplacer."
                  : "La clé reste stockée localement dans ta base de données, comme la clé DeepSeek — jamais dans le code, jamais renvoyée à cette interface après l'ajout. Étapes pour l'obtenir : voir le README, section \"Sources de données (Discover)\"."}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nom</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : GitLab" />
            </div>

            {(type === "GREENHOUSE" || type === "LEVER") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {type === "GREENHOUSE" ? "Board token Greenhouse" : "Company token Lever"}
                </label>
                <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder={type === "GREENHOUSE" ? "ex : gitlab" : "ex : palantir"} />
                <p className="text-xs text-muted-foreground">
                  Le token apparaît dans l&apos;URL de la page carrières de l&apos;entreprise (
                  {type === "GREENHOUSE" ? "job-boards.greenhouse.io/<token>" : "jobs.lever.co/<token>"}).
                </p>
              </div>
            )}

            {(type === "RSS" || type === "JSON_ENDPOINT" || type === "CSV_URL") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {type === "RSS" ? "URL du flux RSS" : type === "JSON_ENDPOINT" ? "URL de l'endpoint JSON" : "URL du fichier CSV"}
                </label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}

            {type === "ADZUNA" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">app_id</label>
                    <Input value={appId} onChange={(e) => setAppId(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">app_key {mode === "edit" && "(laisser vide pour conserver)"}</label>
                    <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={mode === "edit" ? "••••••••" : undefined} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Pays (code 2 lettres)</label>
                    <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="gb, fr, us, sg..." />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Recherche</label>
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="internship" />
                  </div>
                </div>
              </>
            )}

            {type === "JSEARCH" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Clé API RapidAPI {mode === "edit" && "(laisser vide pour conserver)"}</label>
                  <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={mode === "edit" ? "••••••••" : undefined} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Recherche</label>
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="software engineering internship in London" />
                </div>
              </>
            )}

            {type === "REED" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Clé API Reed {mode === "edit" && "(laisser vide pour conserver)"}</label>
                  <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={mode === "edit" ? "••••••••" : undefined} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Mots-clés</label>
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="internship" />
                </div>
              </>
            )}

            {type === "JOOBLE" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Clé API Jooble {mode === "edit" && "(laisser vide pour conserver)"}</label>
                  <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={mode === "edit" ? "••••••••" : undefined} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Mots-clés</label>
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="internship" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Lieu (optionnel)</label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Paris" />
                  </div>
                </div>
              </>
            )}
          </DialogBody>
          <DialogFooter className="pb-5">
            <Button variant="outline" onClick={closeDialog}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={pending}>
              {mode === "edit" ? "Enregistrer & resynchroniser" : "Tester & ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
