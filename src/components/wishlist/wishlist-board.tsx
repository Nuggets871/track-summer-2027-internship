"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { updateCompany } from "@/lib/actions/companies";
import { WISHLIST_CATEGORIES } from "@/lib/constants";
import type { CompanyWithRelations } from "@/lib/data/companies";

export function WishlistBoard({ companies }: { companies: CompanyWithRelations[] }) {
  const [, startTransition] = useTransition();
  const withWishlist = companies.filter((c) => c.wishlistCategory);

  if (withWishlist.length === 0) {
    return <EmptyState icon={Star} title="Aucune entreprise en wishlist" description="Assignez une catégorie (Dream, High Priority...) depuis la fiche entreprise." />;
  }

  return (
    <div className="flex flex-col gap-6">
      {WISHLIST_CATEGORIES.map((cat) => {
        const items = withWishlist.filter((c) => c.wishlistCategory === cat.value);
        if (items.length === 0) return null;
        return (
          <div key={cat.value}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: cat.color }} />
              {cat.label} <span className="text-muted-foreground">({items.length})</span>
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <Card key={c.id} className="flex flex-col gap-3 p-4">
                  <Link href={`/companies/${c.id}`} className="flex items-center gap-2.5">
                    <Avatar name={c.name} src={c.logoUrl} size={32} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.applications.length} candidature{c.applications.length !== 1 ? "s" : ""}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Progress value={c.wishlistProgress} className="flex-1" color={cat.color} />
                    <span className="text-xs font-medium tabular-nums text-foreground">{c.wishlistProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    defaultValue={c.wishlistProgress}
                    onChange={(e) => startTransition(async () => { await updateCompany(c.id, { wishlistProgress: Number(e.target.value) }); })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary"
                  />
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
