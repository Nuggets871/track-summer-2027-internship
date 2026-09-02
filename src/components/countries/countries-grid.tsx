"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { CountryForm } from "@/components/countries/country-form";
import { formatCurrency } from "@/lib/utils";
import type { getCountriesOverview } from "@/lib/data/countries";

type Country = Awaited<ReturnType<typeof getCountriesOverview>>[number];

export function CountriesGrid({ countries }: { countries: Country[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Ajouter un pays
        </Button>
      </div>
      {countries.length === 0 ? (
        <EmptyState icon={Globe2} title="Aucun pays ciblé pour l'instant" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {countries.map((c) => (
            <Link key={c.id} href={`/countries/${c.id}`}>
              <Card className="flex h-full flex-col gap-2 p-4 hover:border-border-strong">
                <CardHeader className="p-0">
                  <CardTitle>{c.name}</CardTitle>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`size-1.5 rounded-full ${i < c.personalPreference ? "bg-primary" : "bg-surface-muted"}`} />
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-1.5 p-0 pt-2 text-sm text-muted-foreground">
                  <p>{c.companiesCount} entreprise{c.companiesCount !== 1 ? "s" : ""} · {c.applicationsCount} candidature{c.applicationsCount !== 1 ? "s" : ""}</p>
                  <p>{c.cities.map((city) => city.name).join(", ") || "Aucune ville renseignée"}</p>
                  {c.responseRate !== null && <p>Taux de réponse : {c.responseRate}%</p>}
                  {c.avgSalary && <p>Salaire moyen observé : {formatCurrency(c.avgSalary)}</p>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Ajouter un pays</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <CountryForm onSuccess={() => setOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
