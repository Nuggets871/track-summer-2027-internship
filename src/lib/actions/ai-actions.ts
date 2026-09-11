"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProfile } from "@/lib/data/profile";
import { generateCoverLetter, type CoverLetterTone, type CoverLetterLanguage } from "@/lib/ai/prompts/cover-letter";
import { optimizeCvForJob, type CvOptimizationResult } from "@/lib/ai/prompts/cv-optimization";
import { generateInterviewPrep } from "@/lib/ai/prompts/interview-prep";
import { aiChat, isAiConfigured } from "@/lib/ai/provider";
import { safeJsonParse } from "@/lib/utils";
import type { ChatMessage } from "@/lib/ai/types";
import { skillKey } from "@/lib/skill-normalization";
import { buildProfileContext } from "@/lib/ai/profile-context";

async function buildProfileSummary() {
  const profile = await getProfile();
  return buildProfileContext(profile, { includeContact: false, includeCv: true });
}

async function getApplicationContext(applicationId: string) {
  return prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { company: true, jobAnalysis: true, coverLetter: true },
  });
}

function matchedSkillsFor(requiredSkillsJson: string | null | undefined, profileSkills: string[]): string[] {
  const required = safeJsonParse<string[]>(requiredSkillsJson, []);
  const profileKeys = new Set(profileSkills.map(skillKey));
  return required.filter((r) => profileKeys.has(skillKey(r)));
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
    jobDescription: application.jobAnalysis?.rawExtractedText?.slice(0, 5000) ?? application.companyResearch ?? null,
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
    update: {
      content: finalContent,
      tone,
      language,
      personalizedElements: matchedSkills.join(", "),
      revisionHistory: application.coverLetter?.content ? JSON.stringify([application.coverLetter.content]) : undefined,
    },
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
    jobDescription: application.jobAnalysis?.rawExtractedText?.slice(0, 5000) ?? application.companyResearch ?? null,
    matchedSkills,
    profileSummary: await buildProfileSummary(),
    tone: (existing.tone as CoverLetterTone) ?? "PROFESSIONAL",
    language: (existing.language as CoverLetterLanguage) ?? "FR",
    previousDraft: existing.content ?? "",
    refineInstruction: instruction,
  });

  if (!content) throw new Error("L'IA n'est pas disponible pour affiner cette lettre. Configurez une clé dans Paramètres > AI.");

  const revisions = safeJsonParse<string[]>(existing.revisionHistory, []);
  if (existing.content) revisions.push(existing.content);
  const history = safeJsonParse<ChatMessage[]>(existing.chatHistory, []);
  history.push({ role: "user", content: instruction }, { role: "assistant", content });
  // revisionHistory is capped below, so its length alone would freeze the
  // version at v21 forever once 20 revisions exist. Increment the stored
  // version instead, which is monotonic.
  const currentVersion = Number.parseInt((existing.version ?? "v1").replace(/^v/i, ""), 10);
  const nextVersion = `v${Number.isFinite(currentVersion) ? currentVersion + 1 : revisions.length + 1}`;
  const letter = await prisma.coverLetter.update({
    where: { applicationId },
    data: { content, version: nextVersion, revisionHistory: JSON.stringify(revisions.slice(-20)), chatHistory: JSON.stringify(history.slice(-20)) },
  });
  revalidatePath(`/opportunities/${applicationId}`);
  return letter;
}

export async function restorePreviousCoverLetter(applicationId: string) {
  const existing = await prisma.coverLetter.findUniqueOrThrow({ where: { applicationId } });
  const revisions = safeJsonParse<string[]>(existing.revisionHistory, []);
  const previous = revisions.pop();
  if (!previous) throw new Error("Aucune version précédente disponible.");
  const letter = await prisma.coverLetter.update({
    where: { applicationId },
    data: { content: previous, version: `v${Math.max(1, revisions.length + 1)}`, revisionHistory: JSON.stringify(revisions) },
  });
  revalidatePath(`/opportunities/${applicationId}`);
  return letter;
}

export async function askOpportunityAssistantAction(applicationId: string, rawMessage: string) {
  const message = rawMessage.trim();
  if (!message) throw new Error("Écris une question.");
  const [application, profile] = await Promise.all([
    prisma.application.findUniqueOrThrow({ where: { id: applicationId }, include: { company: true, jobAnalysis: true, coverLetter: true } }),
    getProfile(),
  ]);
  const history = safeJsonParse<ChatMessage[]>(application.aiChatHistory, []).slice(-12);
  const context = [
    `ENTREPRISE : ${application.company.name}`,
    `CIBLE : ${application.targetRole ?? application.title}`,
    `TYPE : ${application.applicationType}`,
    `CANAL : ${application.outreachChannel ?? "offre publiée"}`,
    `ANNONCE OU RECHERCHE :\n${application.jobAnalysis?.rawExtractedText?.slice(0, 6000) ?? application.companyResearch ?? "non renseignée"}`,
    `DOSSIER CANDIDAT :\n${buildProfileContext(profile, { includeContact: false, includeCv: false })}`,
    application.coverLetter?.content ? `BROUILLON ACTUEL :\n${application.coverLetter.content}` : "",
  ].filter(Boolean).join("\n\n");
  const reply = await aiChat([
    { role: "system", content: `Tu es un coach de candidature attaché à UNE opportunité. Réponds en français, brièvement et concrètement. N'invente aucune information. Si une donnée manque, dis-le. Appuie chaque conseil sur le contexte fourni.\n\n${context}` },
    ...history,
    { role: "user", content: message },
  ], { temperature: 0.35 });
  if (!reply) throw new Error("L'assistant IA n'est pas disponible.");
  const nextHistory: ChatMessage[] = [...history, { role: "user", content: message }, { role: "assistant", content: reply }];
  await prisma.application.update({ where: { id: applicationId }, data: { aiChatHistory: JSON.stringify(nextHistory.slice(-20)) } });
  revalidatePath(`/opportunities/${applicationId}`);
  return { reply, history: nextHistory };
}

export async function generateSpontaneousMessage(applicationId: string) {
  const [application, profile] = await Promise.all([
    prisma.application.findUniqueOrThrow({ where: { id: applicationId }, include: { company: true } }),
    getProfile(),
  ]);
  if (application.applicationType !== "SPONTANEOUS") throw new Error("Cette candidature n'est pas spontanée.");
  const channel = application.outreachChannel ?? "EMAIL";
  const limit = channel === "LINKEDIN" ? "600 caractères maximum" : "180 mots maximum";
  const reply = await aiChat([
    {
      role: "system",
      content: `Tu rédiges un premier message de candidature spontanée en français pour le canal ${channel}. ${limit}. Pas de tiret cadratin, pas de formule « ce n'est pas X, c'est Y », pas de liste mécanique de qualités ni de cliché. N'invente rien. Le message doit préciser le rôle recherché, une raison propre à l'entreprise et une preuve concrète de valeur issue du profil. N'ajoute pas d'objet d'e-mail ni de signature.`,
    },
    {
      role: "user",
      content: `ENTREPRISE : ${application.company.name}\nRÔLE VISÉ : ${application.targetRole ?? application.title}\nDESTINATAIRE : ${application.recipientName ?? "non précisé"}\nRECHERCHE ENTREPRISE : ${application.companyResearch ?? "non renseignée"}\nPROFIL :\n${buildProfileContext(profile, { includeContact: false, includeCv: false })}`,
    },
  ], { temperature: 0.4 });
  if (!reply) throw new Error("L'IA n'est pas disponible.");
  await prisma.application.update({ where: { id: applicationId }, data: { messageDraft: reply } });
  revalidatePath(`/opportunities/${applicationId}`);
  return reply;
}

export async function saveSpontaneousMessage(applicationId: string, content: string) {
  await prisma.application.update({ where: { id: applicationId }, data: { messageDraft: content } });
  revalidatePath(`/opportunities/${applicationId}`);
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

Je souhaite rejoindre ${companyName} au poste de ${title}.

${matchedSkills.length > 0 ? `L'offre fait écho à mon travail avec ${matchedSkills.join(", ")}. ` : ""}${fieldOfStudy ? `Ma formation en ${fieldOfStudy} ` : "Ma formation "}constitue une base utile pour ce rôle.

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

  return optimizeCvForJob(`${buildProfileContext(profile, { includeContact: false, includeCv: false })}\n\nCV brut :\n${profile.cvRawText}`, jobDescription || application.title);
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

// --- Shared -----------------------------------------------------------

export { isAiConfigured };
