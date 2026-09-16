import { getProfile } from "@/lib/data/profile";
import { getSettings } from "@/lib/data/settings";
import { getProviderStatuses } from "@/lib/search/registry";
import { buildSearchQueries, countryCodeFor, roleFromProfile } from "@/lib/search/queries";
import { SearchView } from "@/components/search/search-view";

export const metadata = { title: "Recherche" };

export default async function SearchPage() {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);

  const queries = buildSearchQueries(profile, settings);
  const seen = new Set<string>();
  const countries = queries
    .filter((query) => query.countryName && query.countryCode)
    .filter((query) => {
      if (seen.has(query.countryCode!)) return false;
      seen.add(query.countryCode!);
      return true;
    })
    .map((query) => ({ name: query.countryName!, code: query.countryCode! }));

  const defaultKeywords = `${roleFromProfile(profile)} internship`;
  const providerStatuses = getProviderStatuses();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Recherche</h1>
        <p className="text-sm text-muted-foreground">
          Interroge tes sources activées, filtrées automatiquement sur ton profil. Les clés se configurent dans <code className="rounded bg-surface-muted px-1">.env</code> — rien à régler ici.
        </p>
      </div>
      <SearchView
        providers={providerStatuses}
        defaultKeywords={defaultKeywords}
        countries={countries.length ? countries : [{ name: "Royaume-Uni", code: "gb" }]}
        suggestedCountryCode={countryCodeFor(settings.preferredCountries[0] ?? "Royaume-Uni")}
      />
    </div>
  );
}
