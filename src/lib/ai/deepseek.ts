// Thin, server-only wrapper around the DeepSeek API (OpenAI-compatible chat
// completions). Used to make job-posting extraction more robust across the
// wide variety of real-world page layouts, and to draft cover letters.
//
// This is entirely OPTIONAL: every caller must keep working with sensible,
// deterministic fallbacks when DEEPSEEK_API_KEY isn't set or the call fails
// (network error, timeout, quota) — per the app's "no paid cloud service
// required" guarantee. Never call this from client code; it reads a secret
// from process.env that must stay server-side.

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const REQUEST_TIMEOUT_MS = 20_000;

export function isAiConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

async function callDeepSeek(messages: { role: "system" | "user"; content: string }[], jsonMode: boolean) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.2,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`DeepSeek API error: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    const content: string | undefined = data?.choices?.[0]?.message?.content;
    return content ?? null;
  } catch (err) {
    console.error("DeepSeek API call failed:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const EXTRACTION_SYSTEM_PROMPT = `Tu extrais des informations structurées à partir du texte brut d'une offre de stage/emploi.

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
  if (!isAiConfigured() || !rawText.trim()) return null;

  const content = await callDeepSeek(
    [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: rawText.slice(0, 12_000) },
    ],
    true,
  );
  if (!content) return null;

  try {
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) return null;
    return sanitizeAiExtraction(parsed as Record<string, unknown>);
  } catch (err) {
    console.error("Failed to parse DeepSeek extraction response:", err);
    return null;
  }
}

function sanitizeAiExtraction(raw: Record<string, unknown>): AiExtractionResult {
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

/**
 * Drafts a short, personalized cover-letter starting point from the
 * candidate's profile and the analyzed job. Always framed to the user as an
 * editable draft, never a final document. Returns null if AI isn't
 * configured or the call fails — the UI falls back to a template.
 */
export async function generateCoverLetterDraftWithAI(input: {
  companyName: string;
  title: string;
  matchedSkills: string[];
  responsibilities: string | null;
  profileSummary: string;
}): Promise<string | null> {
  if (!isAiConfigured()) return null;

  const prompt = `Rédige un brouillon de lettre de motivation en français (environ 200 mots), pour ce stage :
Entreprise : ${input.companyName}
Poste : ${input.title}
Compétences du candidat qui correspondent à l'offre : ${input.matchedSkills.join(", ") || "non précisées"}
Responsabilités du poste : ${input.responsibilities ?? "non précisées"}
Profil du candidat : ${input.profileSummary}

Ton : professionnel, direct, sans formules toutes faites. Ne signe pas la lettre (pas de "Cordialement" + nom). C'est un premier brouillon que le candidat va personnaliser ensuite.`;

  const content = await callDeepSeek(
    [
      { role: "system", content: "Tu aides à rédiger des brouillons de lettres de motivation pour des stages, en français, à personnaliser ensuite par le candidat." },
      { role: "user", content: prompt },
    ],
    false,
  );
  return content;
}
