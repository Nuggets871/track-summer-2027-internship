import { aiChat } from "@/lib/ai/provider";

const SYSTEM_PROMPT = `Tu extrais des informations structurées à partir du texte brut d'une offre de stage/emploi.

RÈGLES STRICTES :
- N'extrais QUE ce qui est explicitement écrit dans le texte fourni.
- Si une information n'est pas présente, retourne null pour ce champ (jamais de valeur inventée ou estimée).
- Ne devine jamais le nom de l'entreprise à partir du style d'écriture.
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
Les dates (startDate, deadline) doivent être au format YYYY-MM-DD si une date précise est donnée, sinon null.`;

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
  const isoDate = (v: unknown): string | null =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

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
