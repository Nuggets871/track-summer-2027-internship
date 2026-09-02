import { aiChat } from "@/lib/ai/provider";

export type CoverLetterTone = "PROFESSIONAL" | "NATURAL" | "CONCISE" | "PERSONALIZED";
export type CoverLetterLanguage = "FR" | "EN";

const TONE_INSTRUCTIONS: Record<CoverLetterTone, string> = {
  PROFESSIONAL: "un ton professionnel et formel, structuré, sans familiarité",
  NATURAL: "un ton naturel et conversationnel, comme si le candidat parlait vraiment, sans formules toutes faites",
  CONCISE: "un ton très concis — 120 mots maximum, direct, sans détour",
  PERSONALIZED: "un ton très personnalisé qui s'appuie précisément sur les détails de l'offre et les expériences réelles du candidat, en évitant les généralités",
};

export type CoverLetterInput = {
  companyName: string;
  title: string;
  jobDescription: string | null;
  matchedSkills: string[];
  profileSummary: string;
  tone: CoverLetterTone;
  language: CoverLetterLanguage;
  /** For "Regenerate"/refine actions: the previous draft plus an instruction like "Shorter" or "More specific". */
  previousDraft?: string;
  refineInstruction?: string;
};

const GROUNDING_RULE =
  "N'invente jamais une expérience, un diplôme ou une compétence qui n'est pas mentionné dans le profil fourni. Si le profil manque d'éléments pour une phrase, reste général plutôt que d'inventer un fait.";

export async function generateCoverLetter(input: CoverLetterInput): Promise<string | null> {
  const languageInstruction = input.language === "EN" ? "Write entirely in English." : "Rédige entièrement en français.";

  if (input.previousDraft && input.refineInstruction) {
    const content = await aiChat(
      [
        {
          role: "system",
          content: `Tu réécris un brouillon de lettre de motivation existant selon une instruction précise. ${GROUNDING_RULE} ${languageInstruction} Ne signe pas la lettre. Réponds uniquement avec le texte de la lettre.`,
        },
        {
          role: "user",
          content: `Brouillon actuel :\n${input.previousDraft}\n\nInstruction : ${input.refineInstruction}`,
        },
      ],
      { temperature: 0.4 },
    );
    return content;
  }

  const prompt = `Rédige un brouillon de lettre de motivation pour ce stage, avec ${TONE_INSTRUCTIONS[input.tone]}.
${languageInstruction}

Entreprise : ${input.companyName}
Poste : ${input.title}
Description de l'offre : ${input.jobDescription ?? "non précisée"}
Compétences du candidat qui correspondent à l'offre : ${input.matchedSkills.join(", ") || "non précisées"}
Profil du candidat : ${input.profileSummary}

${GROUNDING_RULE}
Ne signe pas la lettre (pas de formule de politesse finale + nom). C'est un premier brouillon que le candidat va personnaliser ensuite.`;

  return aiChat(
    [
      { role: "system", content: "Tu aides à rédiger des brouillons de lettres de motivation pour des stages, à personnaliser ensuite par le candidat." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.5 },
  );
}
