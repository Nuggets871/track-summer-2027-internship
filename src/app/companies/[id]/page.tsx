import { notFound } from "next/navigation";
import Link from "next/link";
import { Globe, Link2, ExternalLink } from "lucide-react";
import { getCompanyDetail } from "@/lib/data/companies";
import { getReferenceData } from "@/lib/data/reference";
import { computeCompanyFitScore } from "@/lib/scoring";
import { getSettings } from "@/lib/data/settings";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { colorFor, labelFor, WISHLIST_CATEGORIES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { CompanyEditButton } from "@/components/companies/company-edit-button";
import { CompanyApplicationsTab } from "@/components/companies/company-applications-tab";
import { CompanyContactsTab } from "@/components/companies/company-contacts-tab";
import { NotesPanel } from "@/components/shared/notes-panel";
import { DocumentsPanel } from "@/components/documents/documents-panel";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, reference, settings] = await Promise.all([getCompanyDetail(id), getReferenceData(), getSettings()]);
  if (!company) notFound();

  const sectorMatches =
    settings.preferredSectors.length === 0
      ? null
      : Boolean(company.sector && settings.preferredSectors.includes(company.sector));
  const avgProbability =
    company.applications.length > 0
      ? company.applications.reduce((s, a) => s + a.estimatedProbability, 0) / company.applications.length
      : null;
  const sponsorshipValues = company.applications.filter((a) => a.sponsorshipPossible !== null);
  const sponsorshipFriendliness =
    sponsorshipValues.length > 0
      ? (sponsorshipValues.filter((a) => a.sponsorshipPossible).length / sponsorshipValues.length) * 100
      : null;

  const fit = computeCompanyFitScore({
    interestLevel: company.interestLevel,
    countryPreference: company.country?.personalPreference ?? null,
    sectorMatchesPreferences: sectorMatches,
    avgApplicationProbability: avgProbability,
    sponsorshipFriendliness,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={company.name} src={company.logoUrl} size={48} />
          <div>
            <h1 className="text-xl font-semibold text-foreground">{company.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[company.sector, company.type, company.country?.name].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          {company.wishlistCategory && (
            <Badge variant="primary" dotColor={colorFor(WISHLIST_CATEGORIES, company.wishlistCategory)}>
              {labelFor(WISHLIST_CATEGORIES, company.wishlistCategory)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {company.website && (
            <Link href={company.website} target="_blank" className="text-muted-foreground hover:text-foreground">
              <Globe className="size-4" />
            </Link>
          )}
          {company.linkedin && (
            <Link href={company.linkedin} target="_blank" className="text-muted-foreground hover:text-foreground">
              <Link2 className="size-4" />
            </Link>
          )}
          <CompanyEditButton company={company} reference={reference} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Fit Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums text-foreground">{fit.total}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <Progress value={fit.total} />
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {fit.factors.map((f) => (
                <li key={f.key} className="flex justify-between">
                  <span>
                    {f.label} <span className="text-subtle-foreground">(poids {f.weight}%)</span>
                  </span>
                  <span className="tabular-nums">{Math.round(f.value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Candidatures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-foreground">{company.applications.length}</p>
            <p className="text-xs text-muted-foreground">
              dont {company.applications.filter((a) => a.status.key === "OFFER").length} offre(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{company.description || "Aucune description."}</p>
            {company.personalNote && (
              <p className="mt-2 text-sm italic text-foreground">« {company.personalNote} »</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Candidatures</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="applications">
          <CompanyApplicationsTab company={company} reference={reference} />
        </TabsContent>
        <TabsContent value="contacts">
          <CompanyContactsTab company={company} reference={reference} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsPanel documents={company.documents} companyId={company.id} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesPanel notes={company.notes} companyId={company.id} reference={reference} />
        </TabsContent>
      </Tabs>

      {company.researchItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recherches liées</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {company.researchItems.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>{r.title}</span>
                {r.url && (
                  <Link href={r.url} target="_blank" className="text-muted-foreground hover:text-foreground">
                    <ExternalLink className="size-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-subtle-foreground">Ajoutée le {formatDate(company.createdAt)} · Mise à jour le {formatDate(company.updatedAt)}</p>
    </div>
  );
}
