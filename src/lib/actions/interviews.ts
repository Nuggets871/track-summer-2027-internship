"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logInteraction } from "@/lib/data/timeline";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const interviewSchema = z.object({
  applicationId: z.string().min(1),
  companyId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  roundLabel: z.string().min(1, "Le libellé est requis"),
  scheduledAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  durationMinutes: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  format: z.preprocess(emptyToNull, z.string().nullable().optional()),
  interviewers: z.preprocess(emptyToNull, z.string().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  postInterviewNotes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  status: z.string().default("SCHEDULED"),
});

export type InterviewInput = z.infer<typeof interviewSchema>;

function revalidateInterviewPaths(applicationId?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/interviews");
  revalidatePath("/calendar");
  if (applicationId) revalidatePath(`/applications/${applicationId}`);
}

export async function createInterview(raw: z.infer<typeof interviewSchema>) {
  const data = interviewSchema.parse(raw);
  const interview = await prisma.$transaction(async (tx) => {
    const created = await tx.interview.create({ data });
    await logInteraction(
      {
        type: "INTERVIEW",
        summary: `Entretien planifié : ${created.roundLabel}`,
        applicationId: created.applicationId,
        companyId: created.companyId,
        date: created.scheduledAt ?? undefined,
      },
      tx,
    );
    return created;
  });
  revalidateInterviewPaths(interview.applicationId);
  return interview;
}

export async function updateInterview(id: string, raw: Partial<z.infer<typeof interviewSchema>>) {
  const data = interviewSchema.partial().parse(raw);
  const interview = await prisma.interview.update({ where: { id }, data });
  revalidateInterviewPaths(interview.applicationId);
  return interview;
}

export async function deleteInterview(id: string) {
  const interview = await prisma.interview.delete({ where: { id } });
  revalidateInterviewPaths(interview.applicationId);
}

// --- Interview prep -------------------------------------------------------

const interviewPrepSchema = z.object({
  whyCompany: z.preprocess(emptyToNull, z.string().nullable().optional()),
  whyRole: z.preprocess(emptyToNull, z.string().nullable().optional()),
  whyCountry: z.preprocess(emptyToNull, z.string().nullable().optional()),
  relevantExperience: z.preprocess(emptyToNull, z.string().nullable().optional()),
  questionsToAsk: z.preprocess(emptyToNull, z.string().nullable().optional()),
  weaknessesToPrep: z.preprocess(emptyToNull, z.string().nullable().optional()),
  peopleMet: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export async function upsertInterviewPrep(applicationId: string, raw: z.infer<typeof interviewPrepSchema>) {
  const data = interviewPrepSchema.parse(raw);
  const prep = await prisma.interviewPrep.upsert({
    where: { applicationId },
    create: { applicationId, ...data },
    update: data,
  });
  revalidateInterviewPaths(applicationId);
  return prep;
}

const questionSchema = z.object({
  text: z.string().min(1, "La question est requise"),
  category: z.string().default("BEHAVIORAL"),
  status: z.string().default("TO_PREPARE"),
  answerNotes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  interviewPrepId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  isBankItem: z.boolean().default(false),
});

export async function createQuestion(raw: z.infer<typeof questionSchema>) {
  const data = questionSchema.parse(raw);
  const question = await prisma.question.create({ data });
  revalidateInterviewPaths();
  revalidatePath("/interviews/questions");
  return question;
}

export async function updateQuestion(id: string, raw: Partial<z.infer<typeof questionSchema>>) {
  const data = questionSchema.partial().parse(raw);
  const question = await prisma.question.update({ where: { id }, data });
  revalidateInterviewPaths();
  return question;
}

export async function deleteQuestion(id: string) {
  await prisma.question.delete({ where: { id } });
  revalidateInterviewPaths();
}
