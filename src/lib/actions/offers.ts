"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const offerSchema = z.object({
  applicationId: z.string().min(1),
  companyId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  countryId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  role: z.preprocess(emptyToNull, z.string().nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().nullable().optional()),
  salaryAmount: z.preprocess(emptyToNull, z.coerce.number().nullable().optional()),
  currency: z.string().default("EUR"),
  bonus: z.preprocess(emptyToNull, z.coerce.number().nullable().optional()),
  housing: z.boolean().default(false),
  visaSupport: z.boolean().default(false),
  durationMonths: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  startDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  prestige: z.coerce.number().int().min(1).max(5).default(3),
  interest: z.coerce.number().int().min(1).max(5).default(3),
  learning: z.coerce.number().int().min(1).max(5).default(3),
  network: z.coerce.number().int().min(1).max(5).default(3),
  careerPotential: z.coerce.number().int().min(1).max(5).default(3),
  costOfLivingIndex: z.coerce.number().int().min(0).max(100).default(50),
  status: z.string().default("PENDING"),
});

export type OfferInput = z.infer<typeof offerSchema>;

function revalidateOfferPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/offers");
}

export async function upsertOffer(raw: z.infer<typeof offerSchema>) {
  const data = offerSchema.parse(raw);
  const offer = await prisma.offer.upsert({
    where: { applicationId: data.applicationId },
    create: data,
    update: data,
  });
  revalidateOfferPaths();
  revalidatePath(`/applications/${data.applicationId}`);
  return offer;
}

export async function updateOfferStatus(id: string, status: string) {
  const offer = await prisma.offer.update({ where: { id }, data: { status } });
  if (status === "ACCEPTED") {
    const stages = await prisma.pipelineStage.findMany({ where: { key: "OFFER" } });
    if (stages[0]) {
      await prisma.application.update({ where: { id: offer.applicationId }, data: { statusId: stages[0].id } });
    }
  }
  revalidateOfferPaths();
  return offer;
}

export async function deleteOffer(id: string) {
  await prisma.offer.delete({ where: { id } });
  revalidateOfferPaths();
}
