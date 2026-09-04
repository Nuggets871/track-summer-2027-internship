import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";
import type { ProfileForMatching, ProfileLanguage } from "@/lib/job-matching";

export async function getOrCreateProfileRow() {
  const existing = await prisma.profile.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.profile.create({
    data: { id: "singleton", skills: "[]", languages: "[]", experiences: "[]", educationHistory: "[]", projects: "[]" },
  });
}

export type ProfileExperience = {
  title: string;
  company: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

export type ProfileEducation = {
  institution: string;
  degree: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

export type ProfileProject = {
  name: string;
  description: string;
  technologies: string[];
  url: string | null;
  repositoryUrl: string | null;
};

export type AppProfile = ProfileForMatching & {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  fieldOfStudy: string | null;
  experiences: ProfileExperience[];
  educationHistory: ProfileEducation[];
  projects: ProfileProject[];
  cvDocumentId: string | null;
  cvRawText: string | null;
  cvParsedAt: Date | null;
  updatedAt: Date;
};

export async function getProfile(): Promise<AppProfile> {
  const row = await getOrCreateProfileRow();
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    location: row.location,
    headline: row.headline,
    summary: row.summary,
    linkedinUrl: row.linkedinUrl,
    githubUrl: row.githubUrl,
    portfolioUrl: row.portfolioUrl,
    educationLevel: row.educationLevel,
    fieldOfStudy: row.fieldOfStudy,
    graduationYear: row.graduationYear,
    yearsOfExperience: row.yearsOfExperience,
    experiences: safeJsonParse<ProfileExperience[]>(row.experiences, []),
    educationHistory: safeJsonParse<ProfileEducation[]>(row.educationHistory, []),
    projects: safeJsonParse<ProfileProject[]>(row.projects, []),
    skills: safeJsonParse<string[]>(row.skills, []),
    languages: safeJsonParse<ProfileLanguage[]>(row.languages, []),
    workAuthorization: row.workAuthorization,
    availabilityNote: row.availabilityNote,
    availabilityStart: row.availabilityStart,
    availabilityEnd: row.availabilityEnd,
    minDurationWeeks: row.minDurationWeeks,
    maxDurationWeeks: row.maxDurationWeeks,
    cvDocumentId: row.cvDocumentId,
    cvRawText: row.cvRawText,
    cvParsedAt: row.cvParsedAt,
    updatedAt: row.updatedAt,
  };
}

/** Profile completeness — used to nudge the user from Home/Opportunity
 * pages when the Match Score can't be trusted yet for lack of input. */
export function isProfileMinimallyComplete(profile: AppProfile): boolean {
  return profile.skills.length > 0 || profile.educationLevel !== null || profile.experiences.length > 0;
}
