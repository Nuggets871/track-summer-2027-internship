import { prisma } from "@/lib/prisma";
import { RESPONSE_STAGE_KEYS } from "@/lib/constants";

export async function getCountriesOverview() {
  const countries = await prisma.country.findMany({
    include: {
      cities: true,
      companies: true,
      applications: { include: { status: true } },
    },
    orderBy: { name: "asc" },
  });

  return countries.map((c) => {
    const appliedCount = c.applications.filter((a) => a.appliedAt).length;
    const responses = c.applications.filter((a) => RESPONSE_STAGE_KEYS.includes(a.status.key)).length;
    const salaries = c.applications.filter((a) => a.salaryAmount).map((a) => a.salaryAmount!);
    const avgSalary = salaries.length > 0 ? Math.round(salaries.reduce((s, v) => s + v, 0) / salaries.length) : null;

    return {
      ...c,
      companiesCount: c.companies.length,
      applicationsCount: c.applications.length,
      responseRate: appliedCount > 0 ? Math.round((responses / appliedCount) * 100) : null,
      avgSalary,
    };
  });
}

export async function getCountryDetail(id: string) {
  const country = await prisma.country.findUnique({
    where: { id },
    include: {
      cities: true,
      companies: { include: { applications: { include: { status: true } } } },
      applications: { include: { company: true, status: true } },
      contacts: true,
      researchItems: true,
      notes: true,
    },
  });
  return country;
}
