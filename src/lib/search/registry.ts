import { jsearchProvider } from "@/lib/search/providers/jsearch";
import { adzunaProvider } from "@/lib/search/providers/adzuna";
import { serperProvider } from "@/lib/search/providers/serper";
import { atsProvider } from "@/lib/search/providers/ats";
import type { JobSearchProvider, ProviderStatus } from "@/lib/search/types";

// Order = display order. The keyless ATS provider always works; the others
// light up automatically when their key is present in the environment.
export const SEARCH_PROVIDERS: JobSearchProvider[] = [
  atsProvider,
  jsearchProvider,
  adzunaProvider,
  serperProvider,
];

export function getEnabledProviders(): JobSearchProvider[] {
  return SEARCH_PROVIDERS.filter((provider) => provider.isConfigured());
}

export function getProviderStatuses(): ProviderStatus[] {
  return SEARCH_PROVIDERS.map((provider) => ({
    id: provider.id,
    label: provider.label,
    envVars: provider.envVars,
    configured: provider.isConfigured(),
    requiresKey: provider.requiresKey,
  }));
}
