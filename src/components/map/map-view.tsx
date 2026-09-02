"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PRIORITY_LEVELS, labelFor, colorFor } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { MapData } from "@/lib/data/map";

export function MapView({ data }: { data: MapData }) {
  const [selectedCity, setSelectedCity] = useState<{ countryName: string; cityName: string; applications: MapData[number]["cities"][number]["applications"] } | null>(null);

  if (data.length === 0) {
    return <EmptyState icon={MapPin} title="Aucune localisation renseignée" description="Ajoutez un pays et une ville à vos candidatures pour les voir apparaître ici." />;
  }

  const maxTotal = Math.max(...data.map((c) => c.total));

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-muted-foreground">
        Vue simplifiée par pays et ville (la taille de la bulle reflète le nombre d&apos;opportunités). Cliquez sur une ville pour voir le détail.
      </p>
      <div className="flex flex-wrap gap-4">
        {data.map((country) => (
          <Card key={country.id} className="flex min-w-56 flex-col gap-3 p-4">
            <div className="flex items-center gap-2">
              <span
                className="flex items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-soft-foreground"
                style={{ width: 28 + (country.total / maxTotal) * 24, height: 28 + (country.total / maxTotal) * 24 }}
              >
                {country.total}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{country.name}</p>
                <p className="text-xs text-muted-foreground">{country.total} opportunité{country.total !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {country.cities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => setSelectedCity({ countryName: country.name, cityName: city.name, applications: city.applications })}
                  className={cn(
                    "rounded-full border border-border px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary hover:bg-primary-soft",
                  )}
                >
                  {city.name} ({city.applications.length})
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {selectedCity && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {selectedCity.cityName}, {selectedCity.countryName}
            </h3>
            <button className="text-xs text-muted-foreground hover:underline" onClick={() => setSelectedCity(null)}>
              Fermer
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {selectedCity.applications.map((a) => (
              <Link key={a.id} href={`/applications/${a.id}`} className="flex items-center justify-between rounded-md border border-border p-2.5 text-sm hover:border-border-strong">
                <span>
                  {a.company.name} — {a.title}
                </span>
                <div className="flex items-center gap-2">
                  <Badge dotColor={colorFor(PRIORITY_LEVELS, a.priority)}>{labelFor(PRIORITY_LEVELS, a.priority)}</Badge>
                  <Badge dotColor={a.status.color}>{a.status.label}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
