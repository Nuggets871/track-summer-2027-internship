"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { computeCompanyFitScore } from "@/lib/scoring";
import { getSettings } from "@/lib/data/settings";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const companySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  logoUrl: z.preprocess(emptyToNull, z.string().nullable().optional()),
  website: z.preprocess(emptyToNull, z.string().nullable().optional()),
  linkedin: z.preprocess(emptyToNull, z.string().nullable().optional()),
  countryId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  citiesText: z.preprocess(emptyToNull, z.string().nullable().optional()),
  sector: z.preprocess(emptyToNull, z.string().nullable().optional()),
  type: z.preprocess(emptyToNull, z.string().nullable().optional()),
  size: z.preprocess(emptyToNull, z.string().nullable().optional()),
  description: z.preprocess(emptyToNull, z.string().nullable().optional()),
  personalNote: z.preprocess(emptyToNull, z.string().nullable().optional()),
  interestLevel: z.coerce.number().int().min(1).max(5).default(3),
  wishlistCategory: z.preprocess(emptyToNull, z.string().nullable().optional()),
  wishlistProgress: z.coerce.number().int().min(0).max(100).default(0),
});

export type CompanyInput = z.infer<typeof companySchema>;

function revalidateCompanyPaths(id?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/companies");
  revalidatePath("/wishlist");
  revalidatePath("/countries");
  revalidatePath("/map");
  if (id) revalidatePath(`/companies/${id}`);
}

export async function createCompany(raw: CompanyInput) {
  const data = companySchema.parse(raw);
  const company = await prisma.company.create({ data });
  await recomputeCompanyFitScore(company.id);
  revalidateCompanyPaths(company.id);
  return company;
}

export async function updateCompany(id: string, raw: Partial<CompanyInput>) {
  const data = companySchema.partial().parse(raw);
  const company = await prisma.company.update({ where: { id }, data });
  await recomputeCompanyFitScore(id);
  revalidateCompanyPaths(id);
  return company;
}

export async function deleteCompany(id: string) {
  await prisma.company.delete({ where: { id } });
  revalidateCompanyPaths();
}

export async function setCompanyTags(id: string, tagIds: string[]) {
  await prisma.company.update({ where: { id }, data: { tags: { set: tagIds.map((tagId) => ({ id: tagId })) } } });
  revalidateCompanyPaths(id);
}

/**
 * Recomputes Company.fitScore from live data (see src/lib/scoring.ts for the
 * formula). Called after any edit to the company or its applications so the
 * "Fit Score" shown on the company page never drifts from the underlying data.
 */
export async function recomputeCompanyFitScore(companyId: string) {
  const [company, settings, applications] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: companyId }, include: { country: true } }),
    getSettings(),
    prisma.application.findMany({ where: { companyId } }),
  ]);

  const sectorMatches =
    settings.preferredSectors.length === 0
      ? null
      : Boolean(company.sector && settings.preferredSectors.includes(company.sector));

  const avgApplicationProbability =
    applications.length > 0
      ? applications.reduce((sum, a) => sum + a.estimatedProbability, 0) / applications.length
      : null;

  const sponsorshipValues = applications.filter((a) => a.sponsorshipPossible !== null);
  const sponsorshipFriendliness =
    sponsorshipValues.length > 0
      ? (sponsorshipValues.filter((a) => a.sponsorshipPossible).length / sponsorshipValues.length) * 100
      : null;

  const result = computeCompanyFitScore({
    interestLevel: company.interestLevel,
    countryPreference: company.country?.personalPreference ?? null,
    sectorMatchesPreferences: sectorMatches,
    avgApplicationProbability,
    sponsorshipFriendliness,
  });

  await prisma.company.update({ where: { id: companyId }, data: { fitScore: result.total } });
  return result;
}
