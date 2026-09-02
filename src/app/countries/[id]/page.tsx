import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getCountryDetail } from "@/lib/data/countries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountryEditButton } from "@/components/countries/country-edit-button";
import { formatCurrency, safeJsonParse } from "@/lib/utils";

export default async function CountryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const country = await getCountryDetail(id);
  if (!country) notFound();

  const links = safeJsonParse<{ label: string; url: string }[]>(country.usefulLinks, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{country.name}</h1>
          <p className="text-sm text-muted-foreground">{country.region}</p>
        </div>
        <CountryEditButton country={country} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Entreprises</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{country.companies.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Candidatures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{country.applications.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Villes ciblées</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{country.cities.map((c) => c.name).join(", ") || "—"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-warning/40 bg-warning-soft/40">
        <CardContent className="flex items-start gap-2.5 pt-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-medium text-foreground">Notes visa personnelles — pas un conseil juridique</p>
            <p className="text-sm text-muted-foreground">{country.visaNotes || "Aucune note pour l'instant."}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Coût de la vie</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{country.costOfLivingNotes || "Aucune note."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Salaires observés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{country.averageSalaryNote || "Aucune note."}</p>
          </CardContent>
        </Card>
      </div>

      {links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Liens utiles</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            {links.map((l) => (
              <Link key={l.url} href={l.url} target="_blank" className="text-sm text-primary hover:underline">
                {l.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Entreprises ciblées</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {country.companies.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune entreprise pour l&apos;instant.</p>
          ) : (
            country.companies.map((c) => (
              <Link key={c.id} href={`/companies/${c.id}`} className="flex items-center justify-between text-sm hover:underline">
                <span>{c.name}</span>
                <Badge variant="outline">{c.applications.length} candidature{c.applications.length !== 1 ? "s" : ""}</Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      {country.applications.some((a) => a.salaryAmount) && (
        <p className="text-xs text-subtle-foreground">
          Salaire moyen observé sur vos candidatures :{" "}
          {formatCurrency(
            Math.round(
              country.applications.filter((a) => a.salaryAmount).reduce((s, a) => s + (a.salaryAmount ?? 0), 0) /
                country.applications.filter((a) => a.salaryAmount).length,
            ),
          )}
        </p>
      )}
    </div>
  );
}
