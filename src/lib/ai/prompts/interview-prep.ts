import { aiChat } from "@/lib/ai/provider";
import { UNTRUSTED_DATA_RULE, wrapUntrusted } from "@/lib/ai/prompts/shared";

export type InterviewPrepInput = {
  companyName: string;
  title: string;
  jobDescription: string | null;
  profileSummary: string;
  /** Deterministic match engine output — grounds the prep instead of letting
   * the model rediscover strengths/gaps from scratch. */
  matchInsights?: {
    strengths: string[];
    watchouts: string[];
    missingSkills: string[];
  };
};

const SYSTEM_PROMPT = `Tu prépares un candidat à un entretien de stage. Base-toi uniquement sur le dossier candidat réel et sur l'analyse de compatibilité fournis — ne lui invente jamais d'expérience, de compétence ou de résultat. Pour chaque conseil, sélectionne les expériences et projets les plus pertinents et explique brièvement le lien avec l'offre. Si une exigence n'est pas couverte, présente-la honnêtement comme un axe de préparation. Réponds en français, de façon scannable (phrases courtes, pas de pavés).

${UNTRUSTED_DATA_RULE}

Structure ta réponse en Markdown avec exactement ces sections :
## Ce qu'il faut savoir sur le rôle
## Points de ton profil à mettre en avant
## Questions probables
## Points faibles possibles à anticiper
## Questions à poser à la fin`;

export async function generateInterviewPrep(input: InterviewPrepInput): Promise<string | null> {
  const insights = input.matchInsights;
  const insightsBlock = insights && (insights.strengths.length || insights.watchouts.length || insights.missingSkills.length)
    ? `\n\nANALYSE DE COMPATIBILITÉ DÉJÀ CALCULÉE (à réutiliser, pas à contredire) :
- Points forts détectés : ${insights.strengths.join(" ; ") || "aucun"}
- Points de vigilance : ${insights.watchouts.join(" ; ") || "aucun"}
- Compétences manquantes : ${insights.missingSkills.join(", ") || "aucune"}`
    : "";

  const prompt = `Entreprise : ${input.companyName}
Poste : ${input.title}
Description de l'offre :
${wrapUntrusted("job_description", input.jobDescription ?? "non précisée")}

Profil du candidat :
${wrapUntrusted("profile", input.profileSummary)}${insightsBlock}`;

  return aiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    { temperature: 0.4, maxTokens: 2_000 },
  );
}
