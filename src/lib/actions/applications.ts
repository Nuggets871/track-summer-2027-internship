"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const applicationUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  companyName: z.string().min(1).optional(),
  countryName: z.preprocess(emptyToNull, z.string().nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().nullable().optional()),
  remotePossible: z.boolean().optional(),
  jobUrl: z.preprocess(emptyToNull, z.string().url("URL invalide").nullable().optional()),
  source: z.preprocess(emptyToNull, z.string().nullable().optional()),
  deadline: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  potentialStartDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  durationMonths: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  salaryAmount: z.preprocess(emptyToNull, z.coerce.number().nullable().optional()),
  salaryCurrency: z.preprocess(emptyToNull, z.string().nullable().optional()),
  appliedAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  statusId: z.string().min(1).optional(),
  nextAction: z.preprocess(emptyToNull, z.string().nullable().optional()),
  nextActionDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  interviewPrepNotes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;

function revalidateApplicationPaths(id?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/opportunities");
  if (id) revalidatePath(`/opportunities/${id}`);
}

/**
 * Updates the editable fields of an opportunity from its detail page.
 * `companyName`/`countryName` are plain strings here (not foreign keys) —
 * they upsert the underlying Company/Country rows so the simple UI never
 * has to deal with ids.
 */
export async function updateApplication(id: string, raw: ApplicationUpdateInput) {
  const data = applicationUpdateSchema.parse(raw);
  const { companyName, countryName, city, ...rest } = data;

  await prisma.$transaction(async (tx) => {
    let companyId: string | undefined;
    if (companyName) {
      // Company.name has no unique constraint (deliberately, to allow
      // same-named companies in different contexts) — find-or-create.
      const company =
        (await tx.company.findFirst({ where: { name: companyName } })) ??
        (await tx.company.create({ data: { name: companyName } }));
      companyId = company.id;
    }

    let countryId: string | null | undefined;
    if (countryName !== undefined) {
      if (countryName) {
        const country = await tx.country.upsert({
          where: { name: countryName },
          update: {},
          create: { name: countryName },
        });
        countryId = country.id;
      } else {
        countryId = null;
      }
    }

    let cityId: string | null | undefined;
    if (city !== undefined) {
      const effectiveCountryId = countryId ?? (await tx.application.findUnique({ where: { id }, select: { countryId: true } }))?.countryId;
      if (city && effectiveCountryId) {
        const cityRow = await tx.city.upsert({
          where: { name_countryId: { name: city, countryId: effectiveCountryId } },
          update: {},
          create: { name: city, countryId: effectiveCountryId },
        });
        cityId = cityRow.id;
      } else {
        cityId = null;
      }
    }

    await tx.application.update({
      where: { id },
      data: {
        ...rest,
        ...(companyId ? { companyId } : {}),
        ...(countryId !== undefined ? { countryId } : {}),
        ...(cityId !== undefined ? { cityId } : {}),
      },
    });
  });

  revalidateApplicationPaths(id);
}

export async function updateApplicationStatus(id: string, statusId: string) {
  await prisma.application.update({ where: { id }, data: { statusId } });
  revalidateApplicationPaths(id);
}

export async function deleteApplication(id: string) {
  await prisma.application.delete({ where: { id } });
  revalidateApplicationPaths();
}
