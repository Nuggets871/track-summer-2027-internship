import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type LogInteractionInput = {
  type: string;
  summary: string;
  details?: string | null;
  applicationId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  date?: Date;
};

/**
 * Records a timeline entry and bumps `lastInteractionAt` on the related
 * application/contact so freshness scoring and stale-opportunity detection
 * stay accurate without any manual bookkeeping.
 */
export async function logInteraction(input: LogInteractionInput, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  const date = input.date ?? new Date();

  const interaction = await tx.interaction.create({
    data: {
      type: input.type,
      summary: input.summary,
      details: input.details ?? null,
      applicationId: input.applicationId ?? null,
      contactId: input.contactId ?? null,
      companyId: input.companyId ?? null,
      date,
    },
  });

  if (input.applicationId) {
    await tx.application.update({
      where: { id: input.applicationId },
      data: { lastInteractionAt: date },
    });
  }
  if (input.contactId) {
    await tx.contact.update({
      where: { id: input.contactId },
      data: { lastInteractionAt: date },
    });
  }

  return interaction;
}
