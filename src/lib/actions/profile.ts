"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getOrCreateProfileRow } from "@/lib/data/profile";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const profileSchema = z.object({
  educationLevel: z.preprocess(emptyToNull, z.string().nullable().optional()),
  fieldOfStudy: z.preprocess(emptyToNull, z.string().nullable().optional()),
  graduationYear: z.preprocess(emptyToNull, z.coerce.number().int().nullable().optional()),
  yearsOfExperience: z.coerce.number().int().min(0).default(0),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.object({ language: z.string(), level: z.string() })).default([]),
  workAuthorization: z.preprocess(emptyToNull, z.string().nullable().optional()),
  availabilityNote: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export async function updateProfile(raw: ProfileInput) {
  await getOrCreateProfileRow();
  const data = profileSchema.parse(raw);

  await prisma.profile.update({
    where: { id: "singleton" },
    data: {
      educationLevel: data.educationLevel,
      fieldOfStudy: data.fieldOfStudy,
      graduationYear: data.graduationYear,
      yearsOfExperience: data.yearsOfExperience,
      skills: JSON.stringify(data.skills),
      languages: JSON.stringify(data.languages),
      workAuthorization: data.workAuthorization,
      availabilityNote: data.availabilityNote,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/settings");
}
