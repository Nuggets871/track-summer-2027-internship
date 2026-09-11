import { aiChat } from "@/lib/ai/provider";

export type CoverLetterTone = "PROFESSIONAL" | "NATURAL" | "CONCISE" | "PERSONALIZED";
export type CoverLetterLanguage = "FR" | "EN";

const TONE_INSTRUCTIONS: Record<CoverLetterTone, string> = {
  PROFESSIONAL: "un ton professionnel et formel, structuré, sans familiarité",
  NATURAL: "un ton naturel et conversationnel, comme si le candidat parlait vraiment, sans formules toutes faites",
  CONCISE: "un ton très concis — 150 mots maximum, direct, sans détour",
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
  /** The candidate's own past cover letter, used as the voice/structure anchor. */
  referenceLetter?: string | null;
  /** For "Regenerate"/refine actions: the previous draft plus an instruction like "Shorter" or "More specific". */
  previousDraft?: string;
  refineInstruction?: string;
};

const GROUNDING_RULE =
  "N'invente jamais une expérience, un diplôme, une compétence, un résultat chiffré ou une motivation qui n'est pas mentionné dans le dossier candidat ou dans la lettre de référence. N'affirme jamais qu'une compétence manquante est acquise.";

const NATURAL_STYLE_RULES = `STYLE HUMAIN ET SPÉCIFIQUE :
- N'utilise aucun tiret cadratin (—).
- Évite les oppositions rhétoriques « ce n'est pas X, c'est Y » / « it's not X, it's Y », les listes mécaniques de trois qualités et les transitions répétitives.
- Bannir les amorces et clichés interchangeables tels que « C'est avec un grand intérêt », « Je me permets », « Fort de mon expérience », « mon profil correspond parfaitement », « véritable atout », « relever de nouveaux défis ».
- Écris des phrases plutôt courtes et directes. Chaque affirmation importante doit être soutenue par un fait du dossier.
- La lettre doit échouer au test de substitution : remplacer le nom de l'entreprise doit rendre au moins un passage incohérent ou incomplet.`;

const FORMAT_RULE = `FORMAT :
- commence directement par la formule d'appel adaptée au destinataire ;
- termine par une formule de politesse suivie du nom du candidat ;
- n'ajoute ni bloc de coordonnées en tête, ni date, ni adresse de l'entreprise : l'application les ajoute au moment de l'export Word/PDF.`;

function referenceBlock(referenceLetter: string): string {
  return `LETTRE DE RÉFÉRENCE DU CANDIDAT (sa propre lettre passée) :
<<<${referenceLetter}>>>

Cette lettre est une source de vérité, au même titre que le dossier candidat. Sers-t'en comme modèle de voix, de structure et de rythme, et réutilise les faits, expériences et formulations qui y figurent quand ils sont pertinents pour l'offre visée. N'en recopie jamais une phrase spécifique à l'entreprise ou au poste qui y étaient visés : adapte le contenu à la nouvelle offre.`;
}

export async function generateCoverLetter(input: CoverLetterInput): Promise<string | null> {
  const languageInstruction = input.language === "EN" ? "Write entirely in English." : "Rédige entièrement en français.";
  const reference = input.referenceLetter?.trim() ? referenceBlock(input.referenceLetter) : "";

  if (input.previousDraft && input.refineInstruction) {
    const content = await aiChat(
      [
        {
          role: "system",
          content: `Tu réécris un brouillon de lettre de motivation existant selon une instruction précise. ${GROUNDING_RULE} ${NATURAL_STYLE_RULES} ${FORMAT_RULE} ${languageInstruction} Réponds uniquement avec le texte de la lettre.`,
        },
        {
          role: "user",
          content: `DOSSIER CANDIDAT :\n${input.profileSummary}\n\n${reference}\n\nOFFRE :\n${input.companyName} — ${input.title}\n${input.jobDescription ?? "Description non précisée"}\n\nBROUILLON ACTUEL :\n${input.previousDraft}\n\nINSTRUCTION DE RÉÉCRITURE : ${input.refineInstruction}`,
        },
      ],
      { temperature: 0.4, maxTokens: 1_500 },
    );
    return content;
  }

  const prompt = `Rédige une lettre de motivation complète pour ce stage, avec ${TONE_INSTRUCTIONS[input.tone]}.
${languageInstruction}

Entreprise : ${input.companyName}
Poste : ${input.title}
Description de l'offre : ${input.jobDescription ?? "non précisée"}
Compétences du candidat qui correspondent à l'offre : ${input.matchedSkills.join(", ") || "non précisées"}
Profil du candidat : ${input.profileSummary}

${reference}

${GROUNDING_RULE}
${NATURAL_STYLE_RULES}
${FORMAT_RULE}
Choisis au maximum trois preuves concrètes. Commence par les missions professionnelles réellement pertinentes, en reprenant leurs détails et leur contexte, puis utilise un projet personnel seulement s'il apporte une preuve complémentaire. Relie chaque preuve à un besoin explicite de l'offre. Ne force jamais une expérience non pertinente et n'énumère pas simplement des technologies.`;

  return aiChat(
    [
      { role: "system", content: "Tu aides à rédiger des lettres de motivation de stage, personnalisées et fidèles au profil réel du candidat." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.5, maxTokens: 1_500 },
  );
}
