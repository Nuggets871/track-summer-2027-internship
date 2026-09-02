"use client";

import { Sparkles, CalendarClock, Hourglass, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { DiscoverJobCard } from "@/components/discover/discover-job-card";
import type { DiscoverListingRow } from "@/lib/data/discover";

type Sections = {
  recommended: DiscoverListingRow[];
  newThisWeek: DiscoverListingRow[];
  closingSoon: DiscoverListingRow[];
  visaFriendly: DiscoverListingRow[];
};

function Section({
  icon: Icon,
  title,
  items,
  onOpen,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: DiscoverListingRow[];
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-primary" /> {title}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <DiscoverJobCard key={item.id} listing={item} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export function DiscoverSections({ sections, onOpen, isEmpty }: { sections: Sections; onOpen: (id: string) => void; isEmpty: boolean }) {
  if (isEmpty) {
    return (
      <EmptyState
        title="Aucune offre pour l'instant"
        description="Ajoute une source (Paramètres > Sources) ou importe une liste pour commencer à voir des opportunités ici."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Section icon={Sparkles} title="Recommandé pour toi" items={sections.recommended} onOpen={onOpen} />
      <Section icon={CalendarClock} title="Nouveau cette semaine" items={sections.newThisWeek} onOpen={onOpen} />
      <Section icon={Hourglass} title="Deadline proche" items={sections.closingSoon} onOpen={onOpen} />
      <Section icon={ShieldCheck} title="Visa friendly" items={sections.visaFriendly} onOpen={onOpen} />
    </div>
  );
}
