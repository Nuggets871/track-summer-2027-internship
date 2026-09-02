import { getCompaniesWithRelations } from "@/lib/data/companies";
import { WishlistBoard } from "@/components/wishlist/wishlist-board";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const companies = await getCompaniesWithRelations();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Wishlist</h1>
        <p className="text-sm text-muted-foreground">Vos entreprises prioritaires, de Dream à Backup.</p>
      </div>
      <WishlistBoard companies={companies} />
    </div>
  );
}
