"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const coverLetterSchema = z.object({
  applicationId: z.string().min(1),
  companyId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  status: z.string().default("DRAFT"),
  version: z.string().default("v1"),
  content: z.preprocess(emptyToNull, z.string().nullable().optional()),
  personalizedElements: z.preprocess(emptyToNull, z.string().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type CoverLetterInput = z.infer<typeof coverLetterSchema>;

export async function upsertCoverLetter(raw: z.infer<typeof coverLetterSchema>) {
  const data = coverLetterSchema.parse(raw);
  const letter = await prisma.coverLetter.upsert({
    where: { applicationId: data.applicationId },
    create: data,
    update: data,
  });
  revalidatePath("/", "layout");
  revalidatePath("/cover-letters");
  revalidatePath(`/applications/${data.applicationId}`);
  return letter;
}

export async function deleteCoverLetter(id: string) {
  const letter = await prisma.coverLetter.delete({ where: { id } });
  revalidatePath("/cover-letters");
  revalidatePath(`/applications/${letter.applicationId}`);
}
