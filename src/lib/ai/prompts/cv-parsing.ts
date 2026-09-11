import { aiJson } from "@/lib/ai/json";
import { UNTRUSTED_DATA_RULE, wrapUntrusted } from "@/lib/ai/prompts/shared";
import { normalizeSkillList } from "@/lib/skill-normalization";

const SYSTEM_PROMPT = `Tu extrais fidèlement les informations d'un CV pour construire le dossier candidat utilisé par un assistant de candidature.

RÈGLES STRICTES :
- N'extrais QUE ce qui est explicitement écrit dans le CV fourni.
- N'invente jamais une expérience, une compétence, une langue ou une date absente du texte.
- Si une information n'est pas présente, retourne null (ou un tableau vide) pour ce champ.
- ${UNTRUSTED_DATA_RULE}
- Une technologie citée dans une expérience, un projet ou une rubrique technique est une compétence du candidat. Parcours toutes les rubriques, pas uniquement une section nommée "Compétences".
- Conserve les réalisations et le contexte technique dans les descriptions. Ne réduis pas une expérience ou un projet détaillé à son seul titre.
- yearsOfExperience désigne uniquement l'expérience professionnelle du candidat. Calcule les périodes sans compter deux fois les périodes qui se chevauchent, arrondis à l'année inférieure, et ignore l'ancienneté des entreprises.
- Ne classe pas un projet académique comme expérience professionnelle : place-le dans projects.
- Réponds UNIQUEMENT avec un objet JSON valide respectant exactement ce schéma :
{
  "firstName": string | null,
  "lastName": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "headline": string | null,
  "summary": string | null,
  "educationLevel": "HIGH_SCHOOL" | "ASSOCIATE" | "BACHELOR" | "MASTER" | "PHD" | null,
  "fieldOfStudy": string | null,
  "graduationYear": number | null,
  "yearsOfExperience": number | null,
  "skills": string[],
  "languages": [{ "language": string, "level": "BASIC" | "INTERMEDIATE" | "ADVANCED" | "FLUENT" | "NATIVE", "detail": string | null }],
  "experiences": [{ "title": string, "company": string, "startDate": string | null, "endDate": string | null, "description": string | null }],
  "educationHistory": [{ "institution": string, "degree": string, "startDate": string | null, "endDate": string | null, "description": string | null }],
  "projects": [{ "name": string, "description": string, "technologies": string[], "url": string | null, "repositoryUrl": string | null }]
}
Les dates dans experiences doivent rester au format tel qu'écrit dans le CV si non standard (ex: "2023"), ou YYYY-MM si précis.`;

export type ParsedCvExperience = {
  title: string;
  company: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

export type ParsedCvLanguage = { language: string; level: string; detail?: string | null };
export type ParsedCvEducation = { institution: string; degree: string; startDate: string | null; endDate: string | null; description: string | null };
export type ParsedCvProject = { name: string; description: string; technologies: string[]; url: string | null; repositoryUrl: string | null };

export type ParsedCvData = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  summary: string | null;
  educationLevel: string | null;
  fieldOfStudy: string | null;
  graduationYear: number | null;
  yearsOfExperience: number | null;
  skills: string[];
  languages: ParsedCvLanguage[];
  experiences: ParsedCvExperience[];
  educationHistory: ParsedCvEducation[];
  projects: ParsedCvProject[];
};

export async function parseCvWithAI(rawText: string): Promise<ParsedCvData | null> {
  if (!rawText.trim()) return null;

  const parsed = await aiJson(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: wrapUntrusted("cv", rawText.slice(0, 15_000)) },
    ],
    { temperature: 0.1, maxTokens: 2_400 },
  );
  if (typeof parsed !== "object" || parsed === null) return null;
  return sanitizeParsedCv(parsed as Record<string, unknown>);
}

export function sanitizeParsedCv(raw: Record<string, unknown>): ParsedCvData {
  const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const eduLevels = ["HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "PHD"];
  const edu = (v: unknown): string | null => (typeof v === "string" && eduLevels.includes(v) ? v : null);
  const langLevels = ["BASIC", "INTERMEDIATE", "ADVANCED", "FLUENT", "NATIVE"];

  const skills = normalizeSkillList(Array.isArray(raw.skills)
    ? raw.skills.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    : []);

  const languages: ParsedCvLanguage[] = Array.isArray(raw.languages)
    ? raw.languages
        .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
        .map((l) => ({
          language: str(l.language) ?? "",
          level: langLevels.includes(String(l.level)) ? String(l.level) : "INTERMEDIATE",
          ...(str(l.detail) ? { detail: str(l.detail)! } : {}),
        }))
        .filter((l) => l.language)
    : [];

  const educationHistory: ParsedCvEducation[] = Array.isArray(raw.educationHistory)
    ? raw.educationHistory
        .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
        .map((e) => ({ institution: str(e.institution) ?? "", degree: str(e.degree) ?? "", startDate: str(e.startDate), endDate: str(e.endDate), description: str(e.description) }))
        .filter((e) => e.institution || e.degree)
    : [];

  const projects: ParsedCvProject[] = Array.isArray(raw.projects)
    ? raw.projects
        .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
        .map((p) => ({
          name: str(p.name) ?? "",
          description: str(p.description) ?? "",
          technologies: Array.isArray(p.technologies) ? p.technologies.filter((t): t is string => typeof t === "string" && !!t.trim()) : [],
          url: str(p.url),
          repositoryUrl: str(p.repositoryUrl),
        }))
        .filter((p) => p.name)
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
    location: str(raw.location),
    headline: str(raw.headline),
    summary: str(raw.summary),
    educationLevel: edu(raw.educationLevel),
    fieldOfStudy: str(raw.fieldOfStudy),
    graduationYear: num(raw.graduationYear),
    yearsOfExperience: num(raw.yearsOfExperience),
    skills,
    languages,
    experiences,
    educationHistory,
    projects,
  };
}
