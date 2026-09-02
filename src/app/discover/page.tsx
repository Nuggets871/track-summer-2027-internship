import { getDiscoverSections, getDiscoverFilterOptions, getSavedSearches, getJobWatches } from "@/lib/data/discover";
import { isAiConfigured } from "@/lib/ai/provider";
import { prisma } from "@/lib/prisma";
import { DiscoverExplorer } from "@/components/discover/discover-explorer";

export const metadata = { title: "Discover" };

export default async function DiscoverPage() {
  const [sections, filterOptions, savedSearches, watches, aiConfigured, totalListingsCount] = await Promise.all([
    getDiscoverSections(),
    getDiscoverFilterOptions(),
    getSavedSearches(),
    getJobWatches(),
    isAiConfigured(),
    prisma.jobListing.count({ where: { status: "ACTIVE", duplicateOfId: null } }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Discover</h1>
        <p className="text-sm text-muted-foreground">Trouve rapidement les meilleures offres de stage dans le monde.</p>
      </div>
      <DiscoverExplorer
        filterOptions={filterOptions}
        sections={sections}
        initialSavedSearches={savedSearches}
        initialWatches={watches}
        aiConfigured={aiConfigured}
        totalListingsCount={totalListingsCount}
      />
    </div>
  );
}
