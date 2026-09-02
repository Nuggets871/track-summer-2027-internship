"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Plus, ExternalLink, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { RhfSelect } from "@/components/forms/rhf-select";
import { RhfRange } from "@/components/forms/rhf-checkbox";
import { FormField } from "@/components/forms/form-field";
import { createResearchItem, deleteResearchItem, type ResearchItemInput } from "@/lib/actions/research";
import { RESEARCH_CATEGORIES, labelFor } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { ResearchItem } from "@prisma/client";
import type { ReferenceData } from "@/lib/data/reference";

type FormValues = {
  title: string;
  url: string;
  category: string;
  summary: string;
  notes: string;
  interestLevel: number;
  countryId: string;
  companyId: string;
};

export function ResearchBoard({ items, reference }: { items: ResearchItem[]; reference: ReferenceData }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, control, reset } = useForm<FormValues>({ defaultValues: { category: "OTHER", interestLevel: 3 } });

  const filtered = useMemo(() => {
    let rows = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => `${r.title} ${r.summary ?? ""}`.toLowerCase().includes(q));
    }
    if (categoryFilter) rows = rows.filter((r) => r.category === categoryFilter);
    return rows;
  }, [items, search, categoryFilter]);

  const onSubmit = (values: FormValues) => {
    const payload: ResearchItemInput = {
      title: values.title,
      url: values.url || null,
      category: values.category,
      summary: values.summary || null,
      notes: values.notes || null,
      interestLevel: values.interestLevel,
      countryId: values.countryId || null,
      companyId: values.companyId || null,
      applicationId: null,
    };
    startTransition(async () => {
      await createResearchItem(payload);
      toast.success("Ajouté à la recherche");
      reset();
      setOpen(false);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Button variant={categoryFilter === "" ? "secondary" : "outline"} size="sm" onClick={() => setCategoryFilter("")}>
          Tous
        </Button>
        {RESEARCH_CATEGORIES.map((c) => (
          <Button key={c.value} variant={categoryFilter === c.value ? "secondary" : "outline"} size="sm" onClick={() => setCategoryFilter(c.value)}>
            {c.label}
          </Button>
        ))}
        <div className="flex-1" />
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Ajouter
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="Aucun élément de recherche" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <button className="shrink-0 text-muted-foreground hover:text-danger" onClick={() => startTransition(async () => { await deleteResearchItem(r.id); })}>
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              {r.summary && <p className="text-xs text-muted-foreground">{r.summary}</p>}
              <div className="mt-auto flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline">{labelFor(RESEARCH_CATEGORIES, r.category)}</Badge>
                  <span className="text-[11px] text-subtle-foreground">{formatDate(r.addedAt)}</span>
                </div>
                {r.url && (
                  <Link href={r.url} target="_blank" className="text-muted-foreground hover:text-foreground">
                    <ExternalLink className="size-3.5" />
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nouvel élément de recherche</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
              <FormField label="Titre" required>
                <Input {...register("title", { required: true })} />
              </FormField>
              <FormField label="URL">
                <Input {...register("url")} placeholder="https://..." />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Catégorie">
                  <RhfSelect control={control} name="category" options={RESEARCH_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
                </FormField>
                <FormField label="Pays">
                  <RhfSelect control={control} name="countryId" options={reference.countries.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Aucun" />
                </FormField>
              </div>
              <FormField label="Entreprise">
                <RhfSelect control={control} name="companyId" options={reference.companies.map((c) => ({ value: c.id, label: c.name }))} allowEmpty placeholder="Aucune" />
              </FormField>
              <FormField label="Résumé">
                <Textarea rows={2} {...register("summary")} />
              </FormField>
              <FormField label="Notes">
                <Textarea rows={2} {...register("notes")} />
              </FormField>
              <FormField label="Niveau d'intérêt">
                <RhfRange control={control} name="interestLevel" min={1} max={5} step={1} />
              </FormField>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  Ajouter
                </Button>
              </div>
            </form>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
