import type { getCompanyDetail } from "@/lib/data/companies";

export type CompanyDetail = NonNullable<Awaited<ReturnType<typeof getCompanyDetail>>>;
