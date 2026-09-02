"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateSettingsRow } from "@/lib/data/settings";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const settingsSchema = z.object({
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  searchPeriodStart: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  searchPeriodEnd: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  preferredCountries: z.array(z.string()).optional(),
  preferredSectors: z.array(z.string()).optional(),
  preferredCurrencies: z.array(z.string()).optional(),
  sourceOptions: z.array(z.string()).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  followUpRuleDays: z.coerce.number().int().min(1).optional(),
  staleOpportunityDays: z.coerce.number().int().min(1).optional(),
  deadlineWarningDays: z.coerce.number().int().min(0).optional(),
  contactSilenceDays: z.coerce.number().int().min(1).optional(),
  priorityWeights: z
    .object({
      interest: z.number(),
      deadlineProximity: z.number(),
      fit: z.number(),
      probability: z.number(),
      relationship: z.number(),
      staleness: z.number(),
    })
    .optional(),
  matchWeights: z
    .object({
      skills: z.number(),
      experience: z.number(),
      education: z.number(),
      languages: z.number(),
      location: z.number(),
      preferences: z.number(),
    })
    .optional(),
  hasSeenDemoNotice: z.boolean().optional(),
});

export async function updateSettings(raw: z.infer<typeof settingsSchema>) {
  await getOrCreateSettingsRow();
  const data = settingsSchema.parse(raw);

  const { preferredCountries, preferredSectors, preferredCurrencies, sourceOptions, priorityWeights, matchWeights, ...rest } = data;

  await prisma.setting.update({
    where: { id: "singleton" },
    data: {
      ...rest,
      ...(preferredCountries ? { preferredCountries: JSON.stringify(preferredCountries) } : {}),
      ...(preferredSectors ? { preferredSectors: JSON.stringify(preferredSectors) } : {}),
      ...(preferredCurrencies ? { preferredCurrencies: JSON.stringify(preferredCurrencies) } : {}),
      ...(sourceOptions ? { sourceOptions: JSON.stringify(sourceOptions) } : {}),
      ...(priorityWeights ? { priorityWeights: JSON.stringify(priorityWeights) } : {}),
      ...(matchWeights ? { matchWeights: JSON.stringify(matchWeights) } : {}),
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings");
}
