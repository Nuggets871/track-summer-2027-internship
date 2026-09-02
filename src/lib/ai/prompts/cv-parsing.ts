import { aiChat } from "@/lib/ai/provider";

const SYSTEM_PROMPT = `Tu extrais les informations d'un CV pour pré-remplir un profil candidat.

RÈGLES STRICTES :
- N'extrais QUE ce qui est explicitement écrit dans le CV fourni.
- N'invente jamais une expérience, une compétence, une langue ou une date absente du texte.
- Si une information n'est pas présente, retourne null (ou un tableau vide) pour ce champ.
- Réponds UNIQUEMENT avec un objet JSON valide respectant exactement ce schéma :
{
  "firstName": string | null,
  "lastName": string | null,
  "email": string | null,
  "phone": string | null,
  "educationLevel": "HIGH_SCHOOL" | "ASSOCIATE" | "BACHELOR" | "MASTER" | "PHD" | null,
  "fieldOfStudy": string | null,
  "graduationYear": number | null,
  "yearsOfExperience": number | null,
  "skills": string[],
  "languages": [{ "language": string, "level": "BASIC" | "INTERMEDIATE" | "ADVANCED" | "FLUENT" | "NATIVE" }],
  "experiences": [{ "title": string, "company": string, "startDate": string | null, "endDate": string | null, "description": string | null }]
}
Les dates dans experiences doivent rester au format tel qu'écrit dans le CV si non standard (ex: "2023"), ou YYYY-MM si précis.`;

export type ParsedCvExperience = {
  title: string;
  company: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

export type ParsedCvLanguage = { language: string; level: string };

export type ParsedCvData = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  educationLevel: string | null;
  fieldOfStudy: string | null;
  graduationYear: number | null;
  yearsOfExperience: number | null;
  skills: string[];
  languages: ParsedCvLanguage[];
  experiences: ParsedCvExperience[];
};

export async function parseCvWithAI(rawText: string): Promise<ParsedCvData | null> {
  if (!rawText.trim()) return null;

  const content = await aiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText.slice(0, 15_000) },
    ],
    { jsonMode: true, temperature: 0.1 },
  );
  if (!content) return null;

  try {
    const raw = JSON.parse(content) as Record<string, unknown>;
    return sanitize(raw);
  } catch (err) {
    console.error("Failed to parse AI CV-parsing response:", err);
    return null;
  }
}

function sanitize(raw: Record<string, unknown>): ParsedCvData {
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const eduLevels = ["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "PHD"];
  const edu = (v: unknown): string | null => (typeof v === "string" && eduLevels.includes(v) ? v : null);
  const langLevels = ["BASIC", "INTERMEDIATE", "ADVANCED", "FLUENT", "NATIVE"];

  const skills = Array.isArray(raw.skills)
    ? raw.skills.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : [];

  const languages: ParsedCvLanguage[] = Array.isArray(raw.languages)
    ? raw.languages
        .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
        .map((l) => ({
          language: str(l.language) ?? "",
          level: langLevels.includes(String(l.level)) ? String(l.level) : "INTERMEDIATE",
        }))
        .filter((l) => l.language)
    : [];

  const experiences: ParsedCvExperience[] = Array.isArray(raw.experiences)
    ? raw.experiences
        .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
        .map((e) => ({
          title: str(e.title) ?? "",
          company: str(e.company) ?? "",
          startDate: str(e.startDate),
          endDate: str(e.endDate),
          description: str(e.description),
        }))
        .filter((e) => e.title || e.company)
    : [];

  return {
    firstName: str(raw.firstName),
    lastName: str(raw.lastName),
    email: str(raw.email),
    phone: str(raw.phone),
    educationLevel: edu(raw.educationLevel),
    fieldOfStudy: str(raw.fieldOfStudy),
    graduationYear: num(raw.graduationYear),
    yearsOfExperience: num(raw.yearsOfExperience),
    skills,
    languages,
    experiences,
  };
}
