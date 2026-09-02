import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const offerInclude = {
  application: { include: { company: true } },
  company: true,
  country: true,
} satisfies Prisma.OfferInclude;

export type OfferWithRelations = Prisma.OfferGetPayload<{ include: typeof offerInclude }>;

export async function getAllOffers(): Promise<OfferWithRelations[]> {
  return prisma.offer.findMany({ include: offerInclude, orderBy: { createdAt: "desc" } });
}
