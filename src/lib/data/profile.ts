import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";
import type { ProfileForMatching, ProfileLanguage } from "@/lib/job-matching";

export async function getOrCreateProfileRow() {
  const existing = await prisma.profile.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.profile.create({ data: { id: "singleton", skills: "[]", languages: "[]" } });
}

export type AppProfile = ProfileForMatching & { updatedAt: Date; fieldOfStudy: string | null };

export async function getProfile(): Promise<AppProfile> {
  const row = await getOrCreateProfileRow();
  return {
    educationLevel: row.educationLevel,
    fieldOfStudy: row.fieldOfStudy,
    graduationYear: row.graduationYear,
    yearsOfExperience: row.yearsOfExperience,
    skills: safeJsonParse<string[]>(row.skills, []),
    languages: safeJsonParse<ProfileLanguage[]>(row.languages, []),
    workAuthorization: row.workAuthorization,
    availabilityNote: row.availabilityNote,
    updatedAt: row.updatedAt,
  };
}
