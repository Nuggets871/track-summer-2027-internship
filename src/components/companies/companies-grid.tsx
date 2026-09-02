"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Star, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { CompanyForm } from "@/components/forms/company-form";
import { TERMINAL_STAGE_KEYS, WISHLIST_CATEGORIES, labelFor, colorFor } from "@/lib/constants";
import type { CompanyWithRelations } from "@/lib/data/companies";
import type { ReferenceData } from "@/lib/data/reference";

export function CompaniesGrid({ companies, reference }: { companies: CompanyWithRelations[]; reference: ReferenceData }) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter((c) => `${c.name} ${c.sector ?? ""} ${c.country?.name ?? ""}`.toLowerCase().includes(q));
  }, [companies, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle-foreground" />
          <Input placeholder="Rechercher une entreprise..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus /> Nouvelle entreprise
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Aucune entreprise" description="Ajoutez les entreprises que vous ciblez pour votre recherche." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const activeApps = c.applications.filter((a) => !TERMINAL_STAGE_KEYS.includes(a.status.key)).length;
            return (
              <Link key={c.id} href={`/companies/${c.id}`}>
                <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:border-border-strong">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={c.name} src={c.logoUrl} size={36} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[c.sector, c.country?.name].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                    {c.wishlistCategory && (
                      <Badge variant="primary" dotColor={colorFor(WISHLIST_CATEGORIES, c.wishlistCategory)}>
                        <Star className="size-3" /> {labelFor(WISHLIST_CATEGORIES, c.wishlistCategory)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{c.applications.length} candidature{c.applications.length !== 1 ? "s" : ""}</span>
                    <span>{activeApps} active{activeApps !== 1 ? "s" : ""}</span>
                    <span>{c.contacts.length} contact{c.contacts.length !== 1 ? "s" : ""}</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2">
                    <Progress value={c.fitScore} className="flex-1" />
                    <span className="text-xs font-medium tabular-nums text-foreground">{c.fitScore}/100</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nouvelle entreprise</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <CompanyForm reference={reference} onSuccess={() => setCreateOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
