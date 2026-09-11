import { aiJson } from "@/lib/ai/json";
import { UNTRUSTED_DATA_RULE, wrapUntrusted } from "@/lib/ai/prompts/shared";
import { aliasesForSkill, normalizeSkillList } from "@/lib/skill-normalization";

const SYSTEM_PROMPT = `Tu es un extracteur d'offres de stage/emploi très minutieux. On te donne le texte brut d'une page web (offre d'emploi internationale, dans n'importe quelle langue) qui contient souvent, mélangés à l'annonce elle-même, du bruit sans rapport : menu de navigation, bannière de cookies, liens "offres similaires", pied de page, boutons de partage. Ton travail est de lire l'INTÉGRALITÉ du texte fourni (pas seulement le début) pour retrouver, au milieu de ce bruit, chaque information réellement présente dans l'annonce — sans jamais en inventer.

COMMENT CHERCHER (pour vraiment trouver l'info, pas la rater) :
- Lis tout le texte avant de répondre : une information utile peut se trouver après le bruit initial (menu, cookies), au milieu du texte, ou même vers la fin (ex : coordonnées, dates, documents à fournir).
- Les sections n'ont pas toujours l'intitulé attendu et peuvent être dans une autre langue que le reste de la page : "Missions" / "Le poste" / "What you'll do" / "Your role" / "Responsibilities" / "Ihre Aufgaben" / "Tareas" désignent tous la même chose (responsibilities) ; "Profil recherché" / "Ce que nous recherchons" / "Requirements" / "Qualifications" / "Your profile" / "Anforderungen" / "Perfil" désignent tous la même chose (qualifications). Identifie la section par son sens, pas par un mot-clé exact.
- Les compétences obligatoires sont parfois citées dans une phrase et pas seulement dans une liste à puces : extrais-les si le texte impose clairement leur maîtrise au candidat.
- Ne t'arrête pas à la première occurrence d'un mot si une section plus complète existe plus loin dans le texte.

RÈGLES STRICTES (ne jamais inventer) :
- N'extrais QUE ce qui est explicitement écrit dans le texte fourni — chercher partout ne veut pas dire deviner.
- Si une information n'est vraiment présente nulle part, retourne null pour ce champ (jamais de valeur inventée ou estimée).
- Ne devine jamais le nom de l'entreprise à partir du style d'écriture ou d'une URL.
- N'estime jamais un salaire, une deadline ou une durée qui n'est pas explicitement mentionnée.
- ${UNTRUSTED_DATA_RULE}
- requiredExperienceYears désigne UNIQUEMENT le minimum d'expérience professionnelle personnellement exigé du candidat. L'âge, l'ancienneté, la date de création et l'expérience de l'entreprise, de ses fondateurs, de son équipe ou de ses clients doivent toujours donner null. Exemples : "we have 22 years of experience", "founded 22 years ago" et "l'entreprise existe depuis 22 ans" → null.
- requiredEducationLevel désigne UNIQUEMENT un niveau minimum obligatoire. Une plage inclusive de profils acceptés ne doit jamais être transformée en exigence du niveau le plus élevé. Exemples : "whether you're an undergrad or a PhD student", "from Bachelor to PhD" ou "Bachelor, Master or PhD students" → null. "PhD required" → "PHD".
- startDate et endDate décrivent le calendrier auquel le candidat doit explicitement être disponible. Si le texte impose « must be available to start ... and finish ... », extrais les deux dates. Une année placée après la date de fin s'applique aussi à la date de début lorsqu'elles forment la même plage.
- requiredSkills contient uniquement les compétences que le candidat doit posséder. Exclue les technologies seulement utilisées par l'entreprise, les missions, et les compétences simplement souhaitées ("nice to have", "preferred", "a plus", "serait un plus").
- salaryAmount / salaryCurrency / deadline ne doivent être renseignés que si le texte les mentionne explicitement.
- Pour chaque valeur sensible (expérience, formation, calendrier, durée, salaire, deadline, chaque compétence, chaque langue), recopie dans evidence une citation exacte du texte qui la prouve. Pour l'expérience, la citation doit contenir la proposition complète indiquant qu'elle s'applique au candidat. Sans citation exacte et non ambiguë, renvoie null ou un tableau vide.
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
  "durationWeeks": number | null,
  "startDate": string | null,
  "endDate": string | null,
  "deadline": string | null,
  "contractType": string | null,
  "evidence": {
    "requiredExperienceYears": string | null,
    "requiredEducationLevel": string | null,
    "requiredSchedule": string | null,
    "requiredDuration": string | null,
    "salary": string | null,
    "deadline": string | null,
    "requiredSkills": { "nom exact de la compétence": "citation exacte" },
    "requiredLanguages": { "nom exact de la langue": "citation exacte" }
  }
}
Format des dates (startDate, endDate, deadline) :
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
  durationWeeks: number | null;
  startDate: string | null;
  endDate: string | null;
  deadline: string | null;
  contractType: string | null;
  evidence: {
    requiredExperienceYears: string | null;
    requiredEducationLevel: string | null;
    requiredSchedule: string | null;
    requiredDuration: string | null;
    salary: string | null;
    deadline: string | null;
    requiredSkills: Record<string, string>;
    requiredLanguages: Record<string, string>;
  };
}>;

/**
 * Best-effort AI extraction over raw job-posting text. Returns null when AI
 * isn't configured, the call fails, or the response can't be parsed as the
 * expected JSON shape — callers should always have a non-AI fallback ready.
 */
export async function extractJobPostingWithAI(rawText: string): Promise<AiExtractionResult | null> {
  if (!rawText.trim()) return null;

  const parsed = await aiJson(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: wrapUntrusted("job_posting", rawText.slice(0, 30_000)) },
    ],
    { temperature: 0.1, maxTokens: 1_800 },
  );
  if (typeof parsed !== "object" || parsed === null) return null;

  return sanitizeJobExtraction(parsed as Record<string, unknown>, rawText);
}

// English names an AI extractor is likely to return, mapped to the French
// canonical names used everywhere else in the app. Kept here (not just in the
// heuristic extractor) so grounding checks recognize both spellings.
const LANGUAGE_NAME_ALIASES: Record<string, string> = {
  english: "Anglais",
  french: "Français",
  german: "Allemand",
  spanish: "Espagnol",
  italian: "Italien",
  mandarin: "Mandarin",
  chinese: "Mandarin",
  cantonese: "Cantonais",
  arabic: "Arabe",
  portuguese: "Portugais",
  dutch: "Néerlandais",
  japanese: "Japonais",
  korean: "Coréen",
  russian: "Russe",
};

function languageAppearsInText(language: string, text: string): boolean {
  const hay = text.toLocaleLowerCase();
  const normalized = (LANGUAGE_NAME_ALIASES[language.trim().toLocaleLowerCase()] ?? language.trim()).toLocaleLowerCase();
  if (hay.includes(normalized)) return true;
  return Object.entries(LANGUAGE_NAME_ALIASES).some(([english, french]) => french.toLocaleLowerCase() === normalized && hay.includes(english));
}

/** Re-validates the model output against the source text (never trusts it). */
export function sanitizeJobExtraction(raw: Record<string, unknown>, sourceText: string): AiExtractionResult {
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
  const evidenceRaw = typeof raw.evidence === "object" && raw.evidence !== null ? raw.evidence as Record<string, unknown> : {};
  const exactEvidence = (v: unknown): string | null => {
    const value = str(v);
    return value && sourceText.toLocaleLowerCase().includes(value.toLocaleLowerCase()) ? value : null;
  };
  const experienceEvidence = exactEvidence(evidenceRaw.requiredExperienceYears);
  const experienceValue = num(raw.requiredExperienceYears);
  const candidateExperience =
    experienceValue !== null && Number.isInteger(experienceValue) && experienceValue >= 0 && experienceValue <= 15 &&
    experienceEvidence && /\b(you|your|candidate|applicant|must|required?|minimum|at least|profile|qualifications?|vous|votre|candidat|profil|requis|exig[ée]|au moins|justifier|poss[ée]der)\b/i.test(experienceEvidence) &&
    !/\b(company|business|firm|organization|organisation|our team|founder|founded|established|entreprise|soci[ée]t[ée]|équipe|fondateur|fond[ée]e?|cr[ée][ée]e?|existe|depuis)\b/i.test(experienceEvidence)
      ? experienceValue
      : null;
  const educationEvidence = exactEvidence(evidenceRaw.requiredEducationLevel);
  const educationValue = edu(raw.requiredEducationLevel);
  const inclusiveEducationRange = educationEvidence && (
    /(?:whether|from)\b[^.\n]{0,80}\b(?:undergrads?|undergraduates?|bachelors?|students?)\b[^.\n]{0,80}\b(?:or|to|through)\b[^.\n]{0,40}\b(?:ph\.?d|doctorate|doctoral)\b/i.test(educationEvidence) ||
    /\b(?:undergrads?|undergraduates?|bachelors?)\b\s*(?:\/|or|ou|à|to)\s*\b(?:masters?|ph\.?d|doctorants?|doctoral)\b/i.test(educationEvidence)
  );
  const groundedEducation = educationValue && educationEvidence && !inclusiveEducationRange
    ? educationValue
    : null;
  const scheduleEvidence = exactEvidence(evidenceRaw.requiredSchedule);
  const durationEvidence = exactEvidence(evidenceRaw.requiredDuration);
  const salaryEvidence = exactEvidence(evidenceRaw.salary);
  const deadlineEvidence = exactEvidence(evidenceRaw.deadline);

  const skillEvidenceRaw = typeof evidenceRaw.requiredSkills === "object" && evidenceRaw.requiredSkills !== null
    ? evidenceRaw.requiredSkills as Record<string, unknown>
    : {};
  const groundedSkills = strArray(raw.requiredSkills).filter((skill) => {
    const evidence = exactEvidence(skillEvidenceRaw[skill]);
    if (!evidence) return false;
    return aliasesForSkill(skill).some((alias) => sourceText.toLocaleLowerCase().includes(alias.toLocaleLowerCase()));
  });

  const languageEvidenceRaw = typeof evidenceRaw.requiredLanguages === "object" && evidenceRaw.requiredLanguages !== null
    ? evidenceRaw.requiredLanguages as Record<string, unknown>
    : {};
  const groundedLanguages = strArray(raw.requiredLanguages).filter((language) => {
    if (!exactEvidence(languageEvidenceRaw[language])) return false;
    return languageAppearsInText(language, sourceText);
  });

  return {
    title: str(raw.title),
    companyName: str(raw.companyName),
    city: str(raw.city),
    countryName: str(raw.countryName),
    remoteType: remote(raw.remoteType),
    responsibilities: str(raw.responsibilities),
    qualifications: str(raw.qualifications),
    requiredSkills: normalizeSkillList(groundedSkills),
    requiredLanguages: groundedLanguages,
    requiredEducationLevel: groundedEducation,
    requiredExperienceYears: candidateExperience,
    salaryAmount: salaryEvidence ? num(raw.salaryAmount) : null,
    salaryCurrency: salaryEvidence ? str(raw.salaryCurrency) : null,
    durationMonths: durationEvidence ? num(raw.durationMonths) : null,
    durationWeeks: durationEvidence ? num(raw.durationWeeks) : null,
    startDate: scheduleEvidence ? isoDate(raw.startDate) : null,
    endDate: scheduleEvidence ? isoDate(raw.endDate) : null,
    deadline: deadlineEvidence ? isoDate(raw.deadline) : null,
    contractType: str(raw.contractType),
    evidence: {
      requiredExperienceYears: experienceEvidence,
      requiredEducationLevel: educationEvidence,
      requiredSchedule: scheduleEvidence,
      requiredDuration: durationEvidence,
      salary: salaryEvidence,
      deadline: deadlineEvidence,
      requiredSkills: Object.fromEntries(
        Object.entries(skillEvidenceRaw).filter(([, value]) => exactEvidence(value)),
      ) as Record<string, string>,
      requiredLanguages: Object.fromEntries(
        Object.entries(languageEvidenceRaw).filter(([, value]) => exactEvidence(value)),
      ) as Record<string, string>,
    },
  };
}
