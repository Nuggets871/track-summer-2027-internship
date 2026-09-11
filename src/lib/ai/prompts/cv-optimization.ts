import { aiJson } from "@/lib/ai/json";
import { NEVER_INVENT_RULE, UNTRUSTED_DATA_RULE, wrapUntrusted } from "@/lib/ai/prompts/shared";

const SYSTEM_PROMPT = `Tu compares le CV d'un candidat à une offre de stage et proposes des améliorations concrètes.

RÈGLE ABSOLUE : ${NEVER_INVENT_RULE} Le dossier candidat structuré complète le texte du CV et constitue la source de vérité. Tu peux suggérer de reformuler, réordonner, ou mettre en avant des éléments RÉELLEMENT présents, et signaler les mots-clés réellement absents. Chaque réécriture doit conserver exactement le sens et les faits de l'original.

${UNTRUSTED_DATA_RULE}

Réponds UNIQUEMENT avec un objet JSON valide respectant exactement ce schéma :
{
  "highlights": string[],
  "missingKeywords": string[],
  "bulletRewrites": [{ "original": string, "improved": string }],
  "mostRelevantExperiences": string[],
  "recommendedOrder": string[]
}
- highlights : éléments déjà présents dans le CV à mettre davantage en avant.
- missingKeywords : mots-clés ou compétences de l'offre absents du CV.
- bulletRewrites : reformulations de puces existantes, sans ajouter de fait nouveau.
- mostRelevantExperiences : intitulés d'expériences du CV, repris tels quels.
- recommendedOrder : ordre suggéré des sections ou expériences pour ce poste.`;

export type CvOptimizationResult = {
  highlights: string[];
  missingKeywords: string[];
  bulletRewrites: { original: string; improved: string }[];
  mostRelevantExperiences: string[];
  recommendedOrder: string[];
};

export type CvOptimizationInput = {
  profileContext: string;
  cvRawText: string;
  jobDescription: string;
};

export async function optimizeCvForJob(input: CvOptimizationInput): Promise<CvOptimizationResult | null> {
  if (!input.cvRawText.trim() || !input.jobDescription.trim()) return null;

  const parsed = await aiJson(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `DOSSIER CANDIDAT STRUCTURÉ :\n${wrapUntrusted("profile", input.profileContext.slice(0, 6_000))}\n\nCV :\n${wrapUntrusted("cv", input.cvRawText.slice(0, 10_000))}\n\nOFFRE VISÉE :\n${wrapUntrusted("job_description", input.jobDescription.slice(0, 6_000))}`,
      },
    ],
    { temperature: 0.2, maxTokens: 1_500 },
  );
  if (typeof parsed !== "object" || parsed === null) return null;
  return sanitizeCvOptimization(parsed as Record<string, unknown>);
}

export function sanitizeCvOptimization(raw: Record<string, unknown>): CvOptimizationResult {
  const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
  const rewrites = Array.isArray(raw.bulletRewrites)
    ? raw.bulletRewrites
        .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
        .map((r) => ({ original: String(r.original ?? "").trim(), improved: String(r.improved ?? "").trim() }))
        .filter((r) => r.original && r.improved)
    : [];
  return {
    highlights: strArray(raw.highlights),
    missingKeywords: strArray(raw.missingKeywords),
    bulletRewrites: rewrites,
    mostRelevantExperiences: strArray(raw.mostRelevantExperiences),
    recommendedOrder: strArray(raw.recommendedOrder),
  };
}
