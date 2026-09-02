import { getMapData } from "@/lib/data/map";
import { MapView } from "@/components/map/map-view";

export const metadata = { title: "Carte" };

export default async function MapPage() {
  const data = await getMapData();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Carte des opportunités</h1>
        <p className="text-sm text-muted-foreground">Visualisez vos candidatures par pays et par ville.</p>
      </div>
      <MapView data={data} />
    </div>
  );
}
