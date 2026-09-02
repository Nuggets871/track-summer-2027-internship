import { prisma } from "@/lib/prisma";

export async function getMapData() {
  const applications = await prisma.application.findMany({
    include: { company: true, country: true, city: true, status: true },
  });

  const byCountry = new Map<
    string,
    { id: string; name: string; cities: Map<string, { id: string; name: string; applications: typeof applications }> }
  >();

  for (const app of applications) {
    if (!app.country) continue;
    if (!byCountry.has(app.country.id)) {
      byCountry.set(app.country.id, { id: app.country.id, name: app.country.name, cities: new Map() });
    }
    const countryEntry = byCountry.get(app.country.id)!;
    const cityKey = app.city?.id ?? "unknown";
    const cityName = app.city?.name ?? "Ville non renseignée";
    if (!countryEntry.cities.has(cityKey)) {
      countryEntry.cities.set(cityKey, { id: cityKey, name: cityName, applications: [] });
    }
    countryEntry.cities.get(cityKey)!.applications.push(app);
  }

  return [...byCountry.values()]
    .map((c) => ({
      id: c.id,
      name: c.name,
      total: [...c.cities.values()].reduce((s, city) => s + city.applications.length, 0),
      cities: [...c.cities.values()].sort((a, b) => b.applications.length - a.applications.length),
    }))
    .sort((a, b) => b.total - a.total);
}

export type MapData = Awaited<ReturnType<typeof getMapData>>;
