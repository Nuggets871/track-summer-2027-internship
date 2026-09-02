"use client";

import { useEffect, useState } from "react";
import { MapPin, Building2, Clock, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { matchLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { DiscoverListingRow } from "@/lib/data/discover";

const REMOTE_LABELS: Record<string, string> = { REMOTE: "Remote", HYBRID: "Hybride", ONSITE: "Sur site" };

function matchColor(score: number | null) {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-success-foreground";
  if (score >= 40) return "text-warning-foreground";
  return "text-danger-foreground";
}

// Deterministic — safe to compute during SSR since it never reads "now".
function postedAbsolute(date: Date | null): string | null {
  return date ? `Publiée le ${formatDate(date)}` : null;
}

// Reads Date.now(), so it can only be computed after mount: doing this
// during render would make the server-rendered HTML ("il y a 2j") and the
// client's first render ("il y a 3j", a moment later) disagree, which is
// exactly the hydration-mismatch pattern Next.js warns about. The card
// always paints the deterministic absolute date first and swaps to the
// relative label once mounted — a harmless post-hydration content update.
function timeAgo(date: Date): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Publiée aujourd'hui";
  if (days === 1) return "Publiée hier";
  if (days < 30) return `Publiée il y a ${days}j`;
  return postedAbsolute(date)!;
}

export function DiscoverJobCard({ listing, onOpen }: { listing: DiscoverListingRow; onOpen: (id: string) => void }) {
  const location = [listing.cityName, listing.countryName].filter(Boolean).join(", ");
  const [posted, setPosted] = useState(() => postedAbsolute(listing.postedAt));

  useEffect(() => {
    if (!listing.postedAt) return;
    // Deferred to a callback (rather than set directly in the effect body)
    // so this only ever runs once hydration has settled, not as part of it.
    const timer = setTimeout(() => setPosted(timeAgo(listing.postedAt!)), 0);
    return () => clearTimeout(timer);
  }, [listing.postedAt]);

  return (
    <Card
      className="flex cursor-pointer flex-col gap-2.5 p-4 transition-colors hover:border-primary/40"
      onClick={() => onOpen(listing.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{listing.companyName}</p>
          <p className="truncate text-sm text-muted-foreground">{listing.title}</p>
        </div>
        {listing.matchScore != null && (
          <span className={`shrink-0 text-sm font-semibold tabular-nums ${matchColor(listing.matchScore)}`} title={matchLabel(listing.matchScore)}>
            {listing.matchScore}%
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {location && (
          <span className="flex items-center gap-1">
            <MapPin className="size-3" /> {location}
          </span>
        )}
        {listing.remoteType && (
          <span className="flex items-center gap-1">
            <Layers className="size-3" /> {REMOTE_LABELS[listing.remoteType] ?? listing.remoteType}
          </span>
        )}
        {posted && (
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> {posted}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {listing.sector && <Badge variant="outline">{listing.sector}</Badge>}
          {listing.foundSourcesCount > 1 && (
            <Badge variant="outline" className="text-primary">
              Trouvée sur {listing.foundSourcesCount} sources
            </Badge>
          )}
          {listing.visaSponsorship === true && <Badge variant="success">Visa OK</Badge>}
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs text-subtle-foreground">
          <Building2 className="size-3" /> {listing.source.name}
        </span>
      </div>
    </Card>
  );
}
