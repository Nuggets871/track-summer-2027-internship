import { aiChat, type ChatMessage } from "@/lib/ai/provider";

const RULES = `Tu es l'assistant personnel de recherche de stage de l'utilisateur. Tu connais son profil, son CV, ses offres sauvegardées et ses candidatures via le contexte ci-dessous — c'est ta seule source de vérité.

RÈGLES STRICTES :
- N'invente jamais une expérience, un diplôme, une compétence, un projet, un résultat ou une candidature qui n'apparaît pas dans le contexte fourni.
- Pour recommander un angle de candidature, cite les projets ou réalisations précis qui soutiennent la recommandation.
- Si une information manque pour répondre précisément, dis-le clairement plutôt que de deviner.
- Réponds en français, de façon concise et actionnable — pas de longs paragraphes inutiles.
- Tu peux comparer des offres, recommander des priorités, expliquer un score de match, ou aider à préparer une candidature/un entretien, toujours à partir de données réelles.`;

/**
 * `contextSummary` is assembled by the caller (server action, with Prisma
 * access) from the candidate's profile and opportunities — this module only
 * ever sees the resulting text, keeping the prompt itself DB-agnostic and
 * easy to test/tweak in isolation.
 */
export async function askAssistant(history: ChatMessage[], contextSummary: string): Promise<string | null> {
  const systemPrompt = `${RULES}\n\nContexte actuel de l'utilisateur :\n${contextSummary}`;
  return aiChat([{ role: "system", content: systemPrompt }, ...history], { temperature: 0.4 });
}
