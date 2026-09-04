import { aiChat } from "@/lib/ai/provider";

const SYSTEM_PROMPT = `Tu compares le CV d'un candidat à une offre de stage et proposes des améliorations concrètes.

RÈGLE ABSOLUE : ne suggère jamais d'ajouter une expérience, un diplôme, un projet, un résultat chiffré ou une compétence que le candidat n'a pas. Le dossier candidat structuré complète le texte du CV et constitue la source de vérité. Tu peux suggérer de reformuler, réordonner, ou mettre en avant des éléments RÉELLEMENT présents, et signaler les mots-clés réellement absents. Chaque réécriture doit conserver exactement le sens et les faits de l'original.

Réponds UNIQUEMENT avec un objet JSON valide :
{
  "highlights": string[],        // éléments déjà présents dans le CV à mettre davantage en avant
  "missingKeywords": string[],   // mots-clés/compétences de l'offre absents du CV
  "bulletRewrites": [{ "original": string, "improved": string }],
  "mostRelevantExperiences": string[], // titres d'expériences du CV les plus pertinentes pour cette offre
  "recommendedOrder": string[]   // ordre suggéré des sections/expériences pour ce poste
}`;

export type CvOptimizationResult = {
  highlights: string[];
  missingKeywords: string[];
  bulletRewrites: { original: string; improved: string }[];
  mostRelevantExperiences: string[];
  recommendedOrder: string[];
};

export async function optimizeCvForJob(cvText: string, jobDescription: string): Promise<CvOptimizationResult | null> {
  if (!cvText.trim() || !jobDescription.trim()) return null;

  const content = await aiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `CV du candidat :\n${cvText.slice(0, 10_000)}\n\nOffre visée :\n${jobDescription.slice(0, 6_000)}` },
    ],
    { jsonMode: true, temperature: 0.2 },
  );
  if (!content) return null;

  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    const rewrites = Array.isArray(raw.bulletRewrites)
      ? raw.bulletRewrites
          .filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null)
          .map((r) => ({ original: String(r.original ?? ""), improved: String(r.improved ?? "") }))
          .filter((r) => r.original && r.improved)
      : [];
    return {
      highlights: strArray(raw.highlights),
      missingKeywords: strArray(raw.missingKeywords),
      bulletRewrites: rewrites,
      mostRelevantExperiences: strArray(raw.mostRelevantExperiences),
      recommendedOrder: strArray(raw.recommendedOrder),
    };
  } catch (err) {
    console.error("Failed to parse AI CV-optimization response:", err);
    return null;
  }
}
