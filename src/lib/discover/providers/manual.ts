// Represents a bucket of one-off manual imports (a CSV or JSON file pasted/
// uploaded once, not re-fetched from anywhere). "Sync" is a no-op — there is
// nothing to poll; new jobs arrive through the import actions instead
// (see src/lib/actions/discover.ts: importJobsFromCsv / importJobsFromJson).

import type { JobSourceProvider, SourceHealthCheck } from "@/lib/discover/types";

export const manualProvider: JobSourceProvider = {
  type: "MANUAL_IMPORT",

  async searchJobs() {
    return [];
  },

  async healthCheck(): Promise<SourceHealthCheck> {
    return { ok: true, message: "Source manuelle — les offres sont ajoutées par import, pas par synchronisation." };
  },
};
