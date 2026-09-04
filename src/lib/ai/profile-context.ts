import type { AppProfile } from "@/lib/data/profile";

type ContextOptions = { includeContact?: boolean; includeCv?: boolean };

/** One grounded, structured candidate dossier shared by every generative workflow. */
export function buildProfileContext(profile: AppProfile, options: ContextOptions = {}): string {
  const lines: string[] = [
    "DOSSIER CANDIDAT — SOURCE DE VÉRITÉ",
    `Identité : ${[profile.firstName, profile.lastName].filter(Boolean).join(" ") || "non renseignée"}`,
    `Titre : ${profile.headline ?? "non renseigné"}`,
    `Localisation : ${profile.location ?? "non renseignée"}`,
    `Résumé : ${profile.summary ?? "non renseigné"}`,
    `Formation principale : ${profile.educationLevel ?? "non renseignée"}${profile.fieldOfStudy ? ` — ${profile.fieldOfStudy}` : ""}${profile.graduationYear ? ` — diplôme prévu en ${profile.graduationYear}` : ""}`,
    `Expérience professionnelle déclarée : ${profile.yearsOfExperience} an(s)`,
    `Compétences : ${profile.skills.join(", ") || "non renseignées"}`,
    `Langues : ${profile.languages.map((language) => `${language.language} (${language.level}${"detail" in language && language.detail ? `, ${language.detail}` : ""})`).join(", ") || "non renseignées"}`,
    `Disponibilité stricte : ${profile.availabilityStart?.toISOString().slice(0, 10) ?? "début non renseigné"} → ${profile.availabilityEnd?.toISOString().slice(0, 10) ?? "fin non renseignée"}; durée ${profile.minDurationWeeks ?? "min non renseigné"}${profile.maxDurationWeeks ? ` à ${profile.maxDurationWeeks}` : "+"} semaines.`,
    `Notes de disponibilité : ${profile.availabilityNote ?? "aucune"}`,
    `Droit au travail / visa : ${profile.workAuthorization ?? "non renseigné"}`,
  ];

  if (options.includeContact) {
    lines.push(
      `Email : ${profile.email ?? "non renseigné"}`,
      `Téléphone : ${profile.phone ?? "non renseigné"}`,
    );
  }
  lines.push(
    `LinkedIn : ${profile.linkedinUrl ?? "non renseigné"}`,
    `GitHub : ${profile.githubUrl ?? "non renseigné"}`,
    `Portfolio : ${profile.portfolioUrl ?? "non renseigné"}`,
  );

  lines.push("", "EXPÉRIENCES PROFESSIONNELLES");
  if (profile.experiences.length === 0) lines.push("Aucune expérience renseignée.");
  for (const experience of profile.experiences) {
    lines.push(
      `- ${experience.title} — ${experience.company} (${experience.startDate ?? "date inconnue"} → ${experience.endDate ?? "présent"})`,
      `  ${experience.description ?? "Description non renseignée."}`,
    );
  }

  lines.push("", "PARCOURS ACADÉMIQUE");
  if (profile.educationHistory.length === 0) lines.push("Aucune formation détaillée renseignée.");
  for (const education of profile.educationHistory) {
    lines.push(
      `- ${education.degree} — ${education.institution} (${education.startDate ?? "date inconnue"} → ${education.endDate ?? "date inconnue"})`,
      `  ${education.description ?? "Description non renseignée."}`,
    );
  }

  lines.push("", "PROJETS");
  if (profile.projects.length === 0) lines.push("Aucun projet renseigné.");
  for (const project of profile.projects) {
    lines.push(
      `- ${project.name} — technologies : ${project.technologies.join(", ") || "non renseignées"}`,
      `  ${project.description}`,
      ...(project.url ? [`  Démo : ${project.url}`] : []),
      ...(project.repositoryUrl ? [`  Dépôt : ${project.repositoryUrl}`] : []),
    );
  }

  if (options.includeCv && profile.cvRawText) lines.push("", "TEXTE BRUT DU CV", profile.cvRawText);
  return lines.join("\n");
}
