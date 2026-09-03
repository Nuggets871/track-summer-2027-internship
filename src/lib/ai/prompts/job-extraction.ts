import { aiChat } from "@/lib/ai/provider";

const SYSTEM_PROMPT = `Tu es un extracteur d'offres de stage/emploi très minutieux. On te donne le texte brut d'une page web (offre d'emploi internationale, dans n'importe quelle langue) qui contient souvent, mélangés à l'annonce elle-même, du bruit sans rapport : menu de navigation, bannière de cookies, liens "offres similaires", pied de page, boutons de partage. Ton travail est de lire l'INTÉGRALITÉ du texte fourni (pas seulement le début) pour retrouver, au milieu de ce bruit, chaque information réellement présente dans l'annonce — sans jamais en inventer.

COMMENT CHERCHER (pour vraiment trouver l'info, pas la rater) :
- Lis tout le texte avant de répondre : une information utile peut se trouver après le bruit initial (menu, cookies), au milieu du texte, ou même vers la fin (ex : coordonnées, dates, documents à fournir).
- Les sections n'ont pas toujours l'intitulé attendu et peuvent être dans une autre langue que le reste de la page : "Missions" / "Le poste" / "What you'll do" / "Your role" / "Responsibilities" / "Ihre Aufgaben" / "Tareas" désignent tous la même chose (responsibilities) ; "Profil recherché" / "Ce que nous recherchons" / "Requirements" / "Qualifications" / "Your profile" / "Anforderungen" / "Perfil" désignent tous la même chose (qualifications). Identifie la section par son sens, pas par un mot-clé exact.
- Les compétences/outils/technologies demandés sont parfois cités dans une phrase ("maîtrise d'Excel et de SQL est un plus") et pas seulement dans une liste à puces — extrais-les quand même s'ils sont bien nommés explicitement.
- Ne t'arrête pas à la première occurrence d'un mot si une section plus complète existe plus loin dans le texte.

RÈGLES STRICTES (ne jamais inventer) :
- N'extrais QUE ce qui est explicitement écrit dans le texte fourni — chercher partout ne veut pas dire deviner.
- Si une information n'est vraiment présente nulle part, retourne null pour ce champ (jamais de valeur inventée ou estimée).
- Ne devine jamais le nom de l'entreprise à partir du style d'écriture ou d'une URL.
- N'estime jamais un salaire, une deadline ou une durée qui n'est pas explicitement mentionnée.
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, respectant exactement ce schéma :
{
  "title": string | null,
  "companyName": string | null,
  "city": string | null,
  "countryName": string | null,
  "remoteType": "REMOTE" | "HYBRID" | "ONSITE" | null,
  "responsibilities": string | null,
  "qualifications": string | null,
  "requiredSkills": string[],
  "requiredLanguages": string[],
  "requiredEducationLevel": "HIGH_SCHOOL" | "ASSOCIATE" | "BACHELOR" | "MASTER" | "PHD" | null,
  "requiredExperienceYears": number | null,
  "salaryAmount": number | null,
  "salaryCurrency": string | null,
  "durationMonths": number | null,
  "startDate": string | null,
  "deadline": string | null,
  "contractType": string | null
}
Format des dates (startDate, deadline) :
- Jour précis connu → "YYYY-MM-DD".
- Seuls le mois et l'année sont donnés (ex : "à partir de septembre 2026", "closing in March 2026") → "YYYY-MM" (ne renvoie pas null juste parce que le jour exact manque).
- Rien de plus précis qu'une année, ou aucune date mentionnée → null.`;

export type AiExtractionResult = Partial<{
  title: string | null;
  companyName: string | null;
  city: string | null;
  countryName: string | null;
  remoteType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  responsibilities: string | null;
  qualifications: string | null;
  requiredSkills: string[];
  requiredLanguages: string[];
  requiredEducationLevel: string | null;
  requiredExperienceYears: number | null;
  salaryAmount: number | null;
  salaryCurrency: string | null;
  durationMonths: number | null;
  startDate: string | null;
  deadline: string | null;
  contractType: string | null;
}>;

/**
 * Best-effort AI extraction over raw job-posting text. Returns null when AI
 * isn't configured, the call fails, or the response can't be parsed as the
 * expected JSON shape — callers should always have a non-AI fallback ready.
 */
export async function extractJobPostingWithAI(rawText: string): Promise<AiExtractionResult | null> {
  if (!rawText.trim()) return null;

  const content = await aiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText.slice(0, 12_000) },
    ],
    { jsonMode: true, temperature: 0.1 },
  );
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) return null;
    return sanitize(parsed as Record<string, unknown>);
  } catch (err) {
    console.error("Failed to parse AI extraction response:", err);
    return null;
  }
}

function sanitize(raw: Record<string, unknown>): AiExtractionResult {
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
  const remote = (v: unknown): "REMOTE" | "HYBRID" | "ONSITE" | null =>
    v === "REMOTE" || v === "HYBRID" || v === "ONSITE" ? v : null;
  const eduLevels = ["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "PHD"];
  const edu = (v: unknown): string | null => (typeof v === "string" && eduLevels.includes(v) ? v : null);
  const isoDate = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // Mois/année seuls (ex: "2026-09") : on complète au 1er du mois plutôt
    // que de jeter une info réelle simplement parce qu'elle est imprécise.
    if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`;
    return null;
  };

  return {
    title: str(raw.title),
    companyName: str(raw.companyName),
    city: str(raw.city),
    countryName: str(raw.countryName),
    remoteType: remote(raw.remoteType),
    responsibilities: str(raw.responsibilities),
    qualifications: str(raw.qualifications),
    requiredSkills: strArray(raw.requiredSkills),
    requiredLanguages: strArray(raw.requiredLanguages),
    requiredEducationLevel: edu(raw.requiredEducationLevel),
    requiredExperienceYears: num(raw.requiredExperienceYears),
    salaryAmount: num(raw.salaryAmount),
    salaryCurrency: str(raw.salaryCurrency),
    durationMonths: num(raw.durationMonths),
    startDate: isoDate(raw.startDate),
    deadline: isoDate(raw.deadline),
    contractType: str(raw.contractType),
  };
}
