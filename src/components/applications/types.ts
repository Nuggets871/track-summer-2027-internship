import type { getApplicationDetail } from "@/lib/data/applications";

export type ApplicationDetail = NonNullable<Awaited<ReturnType<typeof getApplicationDetail>>>;
