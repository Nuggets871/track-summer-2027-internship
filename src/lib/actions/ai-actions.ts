"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/lib/data/profile";
import { generateCoverLetter, type CoverLetterTone, type CoverLetterLanguage } from "@/lib/ai/prompts/cover-letter";
import { optimizeCvForJob, type CvOptimizationResult } from "@/lib/ai/prompts/cv-optimization";
import { generateInterviewPrep } from "@/lib/ai/prompts/interview-prep";
import { askAssistant } from "@/lib/ai/prompts/assistant";
import { isAiConfigured } from "@/lib/ai/provider";
import { safeJsonParse } from "@/lib/utils";
import type { ChatMessage } from "@/lib/ai/types";

async function buildProfileSummary() {
  const profile = await getProfile();
  return `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim() +
    ` — ${profile.educationLevel ?? "formation non renseignée"}${profile.fieldOfStudy ? ` en ${profile.fieldOfStudy}` : ""}, ${profile.yearsOfExperience} an(s) d'expérience. Compétences : ${profile.skills.join(", ") || "non renseignées"}. Langues : ${profile.languages.map((l) => l.language).join(", ") || "non renseignées"}.`;
}

async function getApplicationContext(applicationId: string) {
  return prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { company: true, jobAnalysis: true },
  });
}

function matchedSkillsFor(requiredSkillsJson: string | null | undefined, profileSkills: string[]): string[] {
  const required = safeJsonParse<string[]>(requiredSkillsJson, []);
  const lower = profileSkills.map((s) => s.toLowerCase());
  return required.filter((r) => lower.includes(r.toLowerCase()));
}

// --- Cover letter -----------------------------------------------------

export async function generateCoverLetterForApplication(
  applicationId: string,
  tone: CoverLetterTone,
  language: CoverLetterLanguage,
) {
  const application = await getApplicationContext(applicationId);
  const profile = await getProfile();
  const matchedSkills = matchedSkillsFor(application.jobAnalysis?.requiredSkills, profile.skills);

  const content = await generateCoverLetter({
    companyName: application.company.name,
    title: application.title,
    jobDescription: application.jobAnalysis?.rawExtractedText?.slice(0, 3000) ?? null,
    matchedSkills,
    profileSummary: await buildProfileSummary(),
    tone,
    language,
  });

  const usedAi = content !== null;
  const finalContent = content ?? templateCoverLetter(application.title, application.company.name, matchedSkills, profile.fieldOfStudy);

  const letter = await prisma.coverLetter.upsert({
    where: { applicationId },
    create: { applicationId, companyId: application.companyId, status: "DRAFT", version: "v1", content: finalContent, tone, language, personalizedElements: matchedSkills.join(", ") },
    update: { content: finalContent, tone, language, personalizedElements: matchedSkills.join(", ") },
  });

  revalidatePath(`/opportunities/${applicationId}`);
  return { letter, usedAi };
}

export async function refineCoverLetter(applicationId: string, instruction: string) {
  const existing = await prisma.coverLetter.findUniqueOrThrow({ where: { applicationId } });
  const application = await getApplicationContext(applicationId);
  const profile = await getProfile();
  const matchedSkills = matchedSkillsFor(application.jobAnalysis?.requiredSkills, profile.skills);

  const content = await generateCoverLetter({
    companyName: application.company.name,
    title: application.title,
    jobDescription: application.jobAnalysis?.rawExtractedText?.slice(0, 3000) ?? null,
    matchedSkills,
    profileSummary: await buildProfileSummary(),
    tone: (existing.tone as CoverLetterTone) ?? "PROFESSIONAL",
    language: (existing.language as CoverLetterLanguage) ?? "FR",
    previousDraft: existing.content ?? "",
    refineInstruction: instruction,
  });

  if (!content) throw new Error("L'IA n'est pas disponible pour affiner cette lettre. Configurez une clé dans Paramètres > AI.");

  const letter = await prisma.coverLetter.update({ where: { applicationId }, data: { content } });
  revalidatePath(`/opportunities/${applicationId}`);
  return letter;
}

export async function saveCoverLetterContent(applicationId: string, content: string) {
  await prisma.coverLetter.upsert({
    where: { applicationId },
    create: { applicationId, content, status: "DRAFT", version: "v1" },
    update: { content },
  });
  revalidatePath(`/opportunities/${applicationId}`);
}

function templateCoverLetter(title: string, companyName: string, matchedSkills: string[], fieldOfStudy: string | null) {
  return `Madame, Monsieur,

Je me permets de vous adresser ma candidature pour le poste de ${title} au sein de ${companyName}.

${matchedSkills.length > 0 ? `Mon profil correspond particulièrement bien à cette offre, notamment grâce à mes compétences en ${matchedSkills.join(", ")}. ` : ""}${fieldOfStudy ? `Ma formation en ${fieldOfStudy} ` : "Ma formation "}m'a permis de développer les compétences nécessaires pour réussir dans ce rôle.

[Ajoutez ici 1-2 exemples concrets de votre expérience en lien avec le poste.]

Je serais ravi(e) d'échanger avec vous pour vous présenter plus en détail ma motivation.

Cordialement,`;
}

// --- CV optimization ----------------------------------------------------

export async function improveCvForApplication(applicationId: string): Promise<CvOptimizationResult | null> {
  const application = await getApplicationContext(applicationId);
  const profile = await getProfile();
  if (!profile.cvRawText) return null;

  const jobDescription =
    application.jobAnalysis?.rawExtractedText ??
    [application.jobAnalysis?.responsibilities, application.jobAnalysis?.qualifications].filter(Boolean).join("\n");

  return optimizeCvForJob(profile.cvRawText, jobDescription || application.title);
}

// --- Interview prep -------------------------------------------------------

export async function generateInterviewPrepForApplication(applicationId: string) {
  const application = await getApplicationContext(applicationId);
  const profileSummary = await buildProfileSummary();

  const content = await generateInterviewPrep({
    companyName: application.company.name,
    title: application.title,
    jobDescription: application.jobAnalysis?.rawExtractedText?.slice(0, 3000) ?? null,
    profileSummary,
  });

  if (!content) throw new Error("L'IA n'est pas disponible pour préparer cet entretien. Configurez une clé dans Paramètres > AI.");

  await prisma.application.update({ where: { id: applicationId }, data: { interviewPrepNotes: content } });
  revalidatePath(`/opportunities/${applicationId}`);
  return content;
}

// --- Assistant --------------------------------------------------------

export async function askAssistantAction(history: ChatMessage[]) {
  const [profile, applications] = await Promise.all([
    getProfile(),
    prisma.application.findMany({
      include: { company: true, status: true, jobAnalysis: { select: { matchScore: true, eligibilityStatus: true } } },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
  ]);

  const profileLines = [
    `Nom : ${[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "non renseigné"}`,
    `Formation : ${profile.educationLevel ?? "non renseignée"}${profile.fieldOfStudy ? ` en ${profile.fieldOfStudy}` : ""}${profile.graduationYear ? `, diplôme prévu ${profile.graduationYear}` : ""}`,
    `Expérience : ${profile.yearsOfExperience} an(s)`,
    `Compétences : ${profile.skills.join(", ") || "non renseignées"}`,
    `Langues : ${profile.languages.map((l) => `${l.language} (${l.level})`).join(", ") || "non renseignées"}`,
    `Disponibilité : ${profile.availabilityNote ?? "non renseignée"}`,
  ];

  const oppLines = applications.map((a) => {
    const match = a.jobAnalysis?.matchScore != null ? `${a.jobAnalysis.matchScore}%` : "non analysé";
    return `- ${a.company.name} — ${a.title} — statut: ${a.status.label} — match: ${match}${a.deadline ? ` — deadline: ${a.deadline.toISOString().slice(0, 10)}` : ""}`;
  });

  const contextSummary = `PROFIL:\n${profileLines.join("\n")}\n\nOPPORTUNITÉS (${applications.length}) :\n${oppLines.join("\n") || "Aucune opportunité enregistrée."}`;

  const reply = await askAssistant(history, contextSummary);
  if (!reply) {
    throw new Error("L'assistant IA n'est pas disponible. Configurez une clé DeepSeek dans Paramètres > AI.");
  }
  return reply;
}

export { isAiConfigured };
