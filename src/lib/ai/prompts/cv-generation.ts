import { aiJson } from "@/lib/ai/json";
import { NEVER_INVENT_RULE, UNTRUSTED_DATA_RULE, wrapUntrusted } from "@/lib/ai/prompts/shared";
import { normalizeCvContent, type CvContent } from "@/lib/cv-content";

export type CvLanguage = "FR" | "EN";

const JSON_SHAPE = `{
  "headline": string,
  "summary": string,
  "sections": [
    {
      "title": string,
      "entries": [
        { "heading": string, "meta": string, "bullets": string[], "tags": string[] }
      ]
    }
  ]
}`;

const SYSTEM_PROMPT = `Tu construis un CV de stage, adapté à une offre précise, à partir du dossier candidat et du texte du CV existant.

RÈGLE ABSOLUE : ${NEVER_INVENT_RULE} Le dossier candidat structuré et le texte du CV constituent la source de vérité. Tu peux reformuler, réordonner et choisir ce qui est pertinent pour l'offre, mais chaque fait (expérience, date, diplôme, compétence, résultat chiffré) doit déjà exister dans ces sources. N'ajoute jamais une compétence absente, même si l'offre la demande.

${UNTRUSTED_DATA_RULE}

RÈGLES DE CONTENU :
- "headline" : un intitulé de poste ciblé, court, cohérent avec le candidat et l'offre.
- "summary" : 2 à 3 phrases maximum, spécifiques à cette offre, sans formule creuse.
- "sections" : 4 rubriques maximum parmi les classiques (expérience professionnelle, formation, projets, compétences, langues, centres d'intérêt si présents). Ordonne-les par pertinence pour l'offre.
- Dans chaque section, "entries" : "heading" = intitulé (poste et entreprise séparés par un tiret simple " - ", diplôme et établissement, nom de projet...), "meta" = période et lieu (« Juin 2025 · Paris »), "bullets" = réalisations concrètes, "tags" = technologies/compétences associées (facultatif, tableau vide sinon).
- Mets en avant les expériences, projets et mots-clés de l'offre RÉELLEMENT présents dans les sources. Reprends les termes de l'offre quand le candidat possède la compétence correspondante.

RÈGLES DE STYLE :
- N'utilise aucun tiret cadratin (—).
- Chaque puce commence par un verbe d'action et décrit un résultat ou une action précise. Pas de liste de technologies seule.
- Ne répète pas la même information dans plusieurs sections.
- Écris dans la langue demandée.

RÈGLE DE SÉLECTION (IMPÉRATIVE) :
- Tu ne dois PAS tout afficher. Choisis uniquement ce qui sert cette offre et écarte le reste : le recruteur doit voir un CV ciblé, pas un historique complet.
- Expérience professionnelle : garde au maximum les 3 expériences les plus pertinentes pour l'offre. Supprime les autres.
- Projets : 2 au maximum, les plus proches de l'offre. Formation : 1 à 2 diplômes les plus pertinents.
- Compétences : uniquement celles demandées ou directement liées à l'offre, jamais la liste complète du candidat.
- Supprime toute rubrique et toute entrée sans lien avec l'offre (centres d'intérêt, expériences anciennes hors sujet...).

RÈGLE DE LONGUEUR (IMPÉRATIVE) :
- Le CV doit tenir sur UNE SEULE page A4. Vise 300 à 420 mots au total, jamais plus de 450.
- 3 puces maximum par expérience ou projet ; 1 à 2 puces pour les expériences secondaires.
- Écarte les puces les moins pertinentes pour cette offre plutôt que de les raccourcir au point d'être creuses. Ne dépasse jamais ces limites, même si l'offre est longue.

Réponds UNIQUEMENT avec un objet JSON valide respectant exactement ce schéma :
${JSON_SHAPE}`;

export type CvGenerationInput = {
  companyName: string;
  title: string;
  jobDescription: string | null;
  matchedSkills: string[];
  profileSummary: string;
  /** The candidate's current CV text, the factual anchor. */
  cvRawText: string | null;
  language: CvLanguage;
};

export type CvRefinementInput = CvGenerationInput & {
  previousContent: CvContent;
  instruction: string;
};

function groundingBlock(input: CvGenerationInput): string {
  const cvBlock = input.cvRawText?.trim() ? `CV ACTUEL DU CANDIDAT :\n${wrapUntrusted("cv", input.cvRawText.slice(0, 12_000))}` : "";
  return `ENTREPRISE : ${input.companyName}
POSTE : ${input.title}
DESCRIPTION DE L'OFFRE :
${wrapUntrusted("job_description", input.jobDescription ?? "non précisée")}

Compétences du candidat qui correspondent à l'offre : ${input.matchedSkills.join(", ") || "non précisées"}

DOSSIER CANDIDAT STRUCTURÉ :
${wrapUntrusted("profile", input.profileSummary.slice(0, 8_000))}

${cvBlock}`;
}

export async function generateTailoredCv(input: CvGenerationInput): Promise<CvContent | null> {
  const languageInstruction = input.language === "EN" ? "Write the entire CV in English." : "Rédige tout le CV en français.";
  const parsed = await aiJson(
    [
      { role: "system", content: `${SYSTEM_PROMPT}\n${languageInstruction}` },
      { role: "user", content: `${groundingBlock(input)}\n\nConstruis le CV complet, adapté à cette offre.` },
    ],
    { temperature: 0.3, maxTokens: 2_600 },
  );
  if (typeof parsed !== "object" || parsed === null) return null;
  return sanitizeGeneratedCv(parsed as Record<string, unknown>);
}

export async function refineTailoredCv(input: CvRefinementInput): Promise<CvContent | null> {
  const languageInstruction = input.language === "EN" ? "Keep the entire CV in English." : "Garde tout le CV en français.";
  const parsed = await aiJson(
    [
      { role: "system", content: `${SYSTEM_PROMPT}\n${languageInstruction}` },
      {
        role: "user",
        content: `${groundingBlock(input)}

CV ACTUEL (à modifier, pas à repartir de zéro) :
${wrapUntrusted("current_cv", JSON.stringify(input.previousContent))}

INSTRUCTION DE MODIFICATION : ${input.instruction}

Renvoie le CV complet mis à jour, au même format JSON, en appliquant uniquement ce qui est demandé et en conservant le reste.`,
      },
    ],
    { temperature: 0.3, maxTokens: 2_600 },
  );
  if (typeof parsed !== "object" || parsed === null) return null;
  return sanitizeGeneratedCv(parsed as Record<string, unknown>);
}

/** Coerces any AI payload into a valid CvContent (never throws). */
export function sanitizeGeneratedCv(raw: Record<string, unknown>): CvContent {
  return normalizeCvContent(raw);
}
