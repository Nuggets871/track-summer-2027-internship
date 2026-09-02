// Turns a free-text Discover search ("Je veux un stage en finance de marché
// à Londres ou Singapour, plutôt dans une grosse banque, été 2027") into
// structured filters applied to the REAL listings already in the database.
//
// Strict rule: this prompt only reorganizes the user's own words into
// filter categories — it never invents a company, a job, or a fact not
// present in the query. If nothing in the query maps to a given filter, that
// filter comes back empty; it never guesses to fill a gap.

import { aiChat } from "@/lib/ai/provider";

const SYSTEM_PROMPT = `Tu transformes une requête de recherche de stage en filtres structurés.

RÈGLE ABSOLUE : n'invente rien. Tu ne fais que réorganiser les mots de la requête de l'utilisateur en catégories. Tu ne dois jamais retourner le nom d'une entreprise, d'une offre, ou d'un pays/ville qui n'est pas explicitement mentionné (ou clairement sous-entendu, ex: "Londres" implique countries: ["Royaume-Uni"]) dans la requête.

Réponds UNIQUEMENT avec un objet JSON valide :
{
  "keywords": string[],      // mots-clés libres restants (secteur, type de poste, taille d'entreprise...) à chercher en texte libre
  "countries": string[],     // pays mentionnés ou clairement impliqués par une ville (ex: Londres -> "Royaume-Uni")
  "cities": string[],        // villes explicitement mentionnées
  "remoteType": "REMOTE" | "HYBRID" | "ONSITE" | null,
  "period": string | null    // période mentionnée telle quelle (ex: "été 2027"), sinon null
}`;

export type ParsedDiscoverQuery = {
  keywords: string[];
  countries: string[];
  cities: string[];
  remoteType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  period: string | null;
};

export async function parseDiscoverQuery(query: string): Promise<ParsedDiscoverQuery | null> {
  if (!query.trim()) return null;

  const content = await aiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: query },
    ],
    { jsonMode: true, temperature: 0.1 },
  );
  if (!content) return null;

  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    const strArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    const remoteType = raw.remoteType;
    return {
      keywords: strArray(raw.keywords),
      countries: strArray(raw.countries),
      cities: strArray(raw.cities),
      remoteType: remoteType === "REMOTE" || remoteType === "HYBRID" || remoteType === "ONSITE" ? remoteType : null,
      period: typeof raw.period === "string" && raw.period.trim() ? raw.period.trim() : null,
    };
  } catch (err) {
    console.error("Failed to parse AI discover-query response:", err);
    return null;
  }
}
