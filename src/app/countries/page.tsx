import { getCountriesOverview } from "@/lib/data/countries";
import { CountriesGrid } from "@/components/countries/countries-grid";

export const metadata = { title: "Pays" };

export default async function CountriesPage() {
  const countries = await getCountriesOverview();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Country Hub</h1>
        <p className="text-sm text-muted-foreground">
          Vos pays ciblés, avec vos propres notes. Les informations visa sont des notes personnelles, pas un conseil juridique.
        </p>
      </div>
      <CountriesGrid countries={countries} />
    </div>
  );
}
