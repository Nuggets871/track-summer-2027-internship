import { getCompaniesWithRelations } from "@/lib/data/companies";
import { getReferenceData } from "@/lib/data/reference";
import { CompaniesGrid } from "@/components/companies/companies-grid";

export const metadata = { title: "Entreprises" };

export default async function CompaniesPage() {
  const [companies, reference] = await Promise.all([getCompaniesWithRelations(), getReferenceData()]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Entreprises</h1>
        <p className="text-sm text-muted-foreground">Base de données des entreprises ciblées pour votre recherche de stage.</p>
      </div>
      <CompaniesGrid companies={companies} reference={reference} />
    </div>
  );
}
