import { getAllOffers } from "@/lib/data/offers";
import { OfferComparison } from "@/components/offers/offer-comparison";

export const metadata = { title: "Comparateur d'offres" };

export default async function OffersPage() {
  const offers = await getAllOffers();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Comparateur d&apos;offres</h1>
        <p className="text-sm text-muted-foreground">Comparez vos offres selon vos propres critères pondérés.</p>
      </div>
      <OfferComparison offers={offers} />
    </div>
  );
}
