// Turns a job posting page (or a manually pasted description) into
// structured data — without ever inventing a field that isn't genuinely
// present in the source. Two extraction strategies, tried in order:
//
// 1. STRUCTURED_DATA — most job boards (LinkedIn, Indeed, Welcome to the
//    Jungle, most ATS-powered career sites) embed a schema.org `JobPosting`
//    JSON-LD block for SEO. When present, this is by far the most reliable
//    source and is used as-is.
// 2. HEURISTIC — otherwise, the page's visible text is scanned with
//    keyword/regex rules (skills list, language names, salary patterns,
//    deadline-like dates, remote/hybrid/on-site wording...). Every field
//    that isn't confidently found stays `null` and is shown as
//    "Non renseigné" in the UI — never guessed from thin air.
//
// A third mode, MANUAL_PASTE, reuses the same heuristics on text the user
// pasted by hand when the page couldn't be fetched at all.

import { COMMON_LANGUAGES, EDUCATION_LEVELS, MASTER_SKILLS } from "@/lib/constants";
import { aliasesForSkill, canonicalizeSkillName, normalizeSkillList } from "@/lib/skill-normalization";

export type ExtractedJobData = {
  title: string | null;
  companyName: string | null;
  city: string | null;
  countryName: string | null;
  remoteType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  description: string | null;
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
  extractionMethod: "STRUCTURED_DATA" | "AI_ENHANCED" | "HEURISTIC" | "MANUAL_PASTE";
  rawText: string;
};

const EMPTY: Omit<ExtractedJobData, "extractionMethod" | "rawText"> = {
  title: null,
  companyName: null,
  city: null,
  countryName: null,
  remoteType: null,
  description: null,
  responsibilities: null,
  qualifications: null,
  requiredSkills: [],
  requiredLanguages: [],
  requiredEducationLevel: null,
  requiredExperienceYears: null,
  salaryAmount: null,
  salaryCurrency: null,
  durationMonths: null,
  startDate: null,
  deadline: null,
  contractType: null,
};

// About 7–8k tokens: large enough for long ATS pages while staying well
// within the provider context window after the system prompt is added.
const MAX_RAW_TEXT = 30_000;

// Job pages routinely bury the actual posting under recurring UI chrome —
// cookie banners, nav menus, footers, share/login buttons — which eats into
// the (bounded) text budget sent downstream without ever containing real job
// info. Dropping obviously-boilerplate lines before truncating lets more of
// the real posting survive into that budget, both for the heuristics above
// and for the AI extraction pass that reuses this same rawText.
const BOILERPLATE_LINE_PATTERNS: RegExp[] = [
  /^(accept|refuse|reject|manage)\s+(all\s+)?cookies?/i,
  /^(accepter|refuser|g[ée]rer)\s+(tous\s+les\s+)?cookies?/i,
  /^(politique de confidentialit[ée]|privacy policy|terms of (service|use)|conditions d'utilisation)$/i,
  /^(se connecter|log ?in|sign ?in|s'inscrire|sign ?up|cr[ée]er un compte)$/i,
  /^(accueil|home|[àa] propos|about( us)?|contact|carri[èe]res?|careers?|blog)$/i,
  /^(partager|share)(\s*(on|sur)?\s*(linkedin|facebook|twitter|x)?)?$/i,
  /^©\s*\d{4}/,
  /^all rights reserved/i,
  /^tous droits r[ée]serv[ée]s/i,
  /^(offres? similaires?|similar jobs?|related jobs?|recommended for you)$/i,
];

function stripBoilerplateLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true; // keep blank lines, they preserve paragraph breaks
      return !BOILERPLATE_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
    })
    .join("\n");
}

// --- HTML utilities --------------------------------------------------------

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const withBreaks = withoutScripts
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ");
  const stripped = withBreaks.replace(/<[^>]+>/g, " ");
  return decodeEntities(stripped)
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  const raw = decodeEntities(match[1]).trim();
  // "Job Title - Company | Site" style titles: keep the first segment.
  return raw.split(/\s[-|–]\s/)[0]?.trim() || raw || null;
}

// --- Strategy 1: schema.org JobPosting JSON-LD -----------------------------

function findJobPostingNode(node: unknown): Record<string, unknown> | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPostingNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    const typeMatches =
      type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
    if (typeMatches) return obj;
    if (obj["@graph"]) return findJobPostingNode(obj["@graph"]);
  }
  return null;
}

function textFrom(value: unknown): string | null {
  if (typeof value === "string") return htmlToText(value).trim() || null;
  return null;
}

function extractStructuredData(html: string): Partial<ExtractedJobData> | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1].trim());
    } catch {
      continue;
    }
    const job = findJobPostingNode(parsed);
    if (!job) continue;

    const org = job.hiringOrganization as Record<string, unknown> | undefined;
    const location = job.jobLocation as Record<string, unknown> | undefined;
    const address = (Array.isArray(location) ? location[0] : location)?.address as
      | Record<string, unknown>
      | undefined;
    const salary = job.baseSalary as Record<string, unknown> | undefined;
    const salaryValue = salary?.value as Record<string, unknown> | undefined;

    const remoteRaw = String(job.jobLocationType ?? "").toUpperCase();
    const remoteType =
      remoteRaw.includes("TELECOMMUTE") || remoteRaw.includes("REMOTE") ? "REMOTE" : null;

    const employmentType = String(job.employmentType ?? "");

    return {
      title: textFrom(job.title),
      companyName: textFrom(org?.name),
      city: textFrom(address?.addressLocality),
      countryName: textFrom(address?.addressCountry),
      remoteType,
      description: textFrom(job.description),
      salaryAmount:
        typeof salaryValue?.minValue === "number"
          ? salaryValue.minValue
          : typeof salaryValue?.value === "number"
            ? salaryValue.value
            : null,
      salaryCurrency: textFrom(salary?.currency),
      deadline: textFrom(job.validThrough),
      contractType: employmentType ? htmlToText(employmentType) : null,
    };
  }
  return null;
}

// --- Strategy 2: heuristics over plain text ---------------------------------

function findSection(text: string, headers: string[]): string | null {
  const pattern = new RegExp(`(?:${headers.join("|")})\\s*[:\\n]([\\s\\S]{0,1500}?)(?:\\n\\s*\\n|$)`, "i");
  const match = text.match(pattern);
  return match ? match[1].trim().slice(0, 1200) || null : null;
}

function detectRemoteType(text: string): ExtractedJobData["remoteType"] {
  const lower = text.toLowerCase();
  if (/\bhybrid(e)?\b/.test(lower)) return "HYBRID";
  if (/\b(full[\s-]?remote|remote[\s-]?first|100%\s*remote|télétravail complet)\b/.test(lower)) return "REMOTE";
  if (/\bremote\b|\btélétravail\b/.test(lower)) return "REMOTE";
  if (/\bon[\s-]?site\b|\bsur site\b|\bprésentiel\b/.test(lower)) return "ONSITE";
  return null;
}

function detectSkills(text: string): string[] {
  const found = new Set<string>();
  for (const skill of MASTER_SKILLS) {
    const detected = aliasesForSkill(skill).some((alias) => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?<![a-zA-Z0-9])${escaped}(?![a-zA-Z0-9])`, "i").test(text);
    });
    if (detected) found.add(canonicalizeSkillName(skill));
  }
  return [...found];
}

// English names an AI extractor is likely to return, mapped to the French
// canonical names used everywhere else in the app (Profile languages,
// COMMON_LANGUAGES) so "English" and "Anglais" are never treated as two
// different required languages.
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

export function normalizeLanguageName(name: string): string {
  const alias = LANGUAGE_NAME_ALIASES[name.trim().toLowerCase()];
  return alias ?? name.trim();
}

function detectLanguages(text: string): string[] {
  const found = new Set<string>();
  const englishAliases = /\b(english|anglais)\b/i;
  const frenchAliases = /\b(french|français)\b/i;
  if (englishAliases.test(text)) found.add("Anglais");
  if (frenchAliases.test(text)) found.add("Français");
  for (const lang of COMMON_LANGUAGES) {
    if (lang === "Anglais" || lang === "Français") continue;
    if (new RegExp(`\\b${lang}\\b`, "i").test(text)) found.add(lang);
  }
  return [...found];
}

function detectEducationLevel(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bph\.?d\b|\bdoctorat\b/.test(lower)) return "PHD";
  if (/\bmaster\b|\bmba\b|\bbac\s*\+\s*5\b/.test(lower)) return "MASTER";
  if (/\bbachelor\b|\blicence\b|\bbac\s*\+\s*3\b/.test(lower)) return "BACHELOR";
  if (/\bbts\b|\bdut\b|\bbac\s*\+\s*2\b|\bassociate degree\b/.test(lower)) return "ASSOCIATE";
  return null;
}

function detectExperienceYears(text: string): number | null {
  const pattern = /(\d{1,2})\s*\+?\s*(?:years?|ans?)\s*(?:(?:of|d['’]?)\s*)?(?:(?:professional|relevant|work|professionnelle?)\s+)?(?:experience|exp[ée]rience)/gi;
  const candidateCue = /\b(you|your|candidate|applicant|must|required?|requirements?|minimum|at least|profile|qualifications?|vous|votre|candidat|profil|requis|exig[ée]|au moins|justifier|poss[ée]der)\b/i;
  const companyCue = /\b(company|business|firm|organisation|organization|our team|collective|combined|founder|founded|established|operating|serving|track record|in business|entreprise|soci[ée]t[ée]|équipe|fondateur|fond[ée]e?|cr[ée][ée]e?|existe|depuis)\b/i;
  const sectionCue = /\b(qualifications?|requirements?|your profile|profil recherch[ée]|ce que nous recherchons|anforderungen|perfil)\b/i;

  for (const match of text.matchAll(pattern)) {
    const years = Number(match[1]);
    if (!Number.isInteger(years) || years < 0 || years > 15) continue;
    const index = match.index ?? 0;
    const sentenceStart = Math.max(text.lastIndexOf("\n", index), text.lastIndexOf(".", index), 0);
    const nextNewline = text.indexOf("\n", index + match[0].length);
    const nextPeriod = text.indexOf(".", index + match[0].length);
    const candidates = [nextNewline, nextPeriod].filter((value) => value >= 0);
    const sentenceEnd = candidates.length ? Math.min(...candidates) : Math.min(text.length, index + 220);
    const sentence = text.slice(sentenceStart, sentenceEnd);
    const subjectPrefix = text.slice(sentenceStart, index);
    const nearbyBefore = text.slice(Math.max(0, index - 220), index);
    if (companyCue.test(subjectPrefix) && !candidateCue.test(subjectPrefix)) continue;
    if (companyCue.test(sentence) && !candidateCue.test(sentence)) continue;
    if (candidateCue.test(sentence) || sectionCue.test(nearbyBefore)) return years;
  }
  return null;
}

function detectSalary(text: string): { salaryAmount: number | null; salaryCurrency: string | null } {
  const currencyMap: [RegExp, string][] = [
    [/€|EUR/, "EUR"],
    [/£|GBP/, "GBP"],
    [/\$|USD/, "USD"],
    [/CHF/, "CHF"],
    [/SGD/, "SGD"],
    [/AED/, "AED"],
    [/CAD/, "CAD"],
    [/AUD/, "AUD"],
    [/HKD/, "HKD"],
  ];
  const numberPattern = /(?:€|£|\$|EUR|GBP|USD|CHF|SGD|AED|CAD|AUD|HKD)\s*([\d][\d,. ]{1,9})\s*(k)?/i;
  const match = text.match(numberPattern);
  if (!match) return { salaryAmount: null, salaryCurrency: null };

  const rawNumber = match[1].replace(/[,. ](?=\d{3}\b)/g, "").replace(/[, ]/g, "");
  let amount = parseFloat(rawNumber);
  if (Number.isNaN(amount)) return { salaryAmount: null, salaryCurrency: null };
  if (match[2]) amount *= 1000;

  const currency = currencyMap.find(([re]) => re.test(match[0]))?.[1] ?? null;
  return { salaryAmount: amount, salaryCurrency: currency };
}

function detectDuration(text: string): number | null {
  const match = text.match(/(\d{1,2})\s*(?:-\s*\d{1,2}\s*)?(?:months?|mois)/i);
  return match ? Number(match[1]) : null;
}

function detectDateNear(text: string, keywords: RegExp): string | null {
  const idx = text.search(keywords);
  if (idx === -1) return null;
  const window = text.slice(idx, idx + 120);
  const isoMatch = window.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];
  const longMatch = window.match(
    /\b(\d{1,2})\s+(jan\w*|f[ée]v\w*|mar\w*|avr\w*|mai|juin?|juil\w*|ao[uû]t|sept\w*|oct\w*|nov\w*|d[ée]c\w*|january|february|march|april|may|june|july|august|september|october|november|december)\.?\s+(\d{4})\b/i,
  );
  if (longMatch) {
    const parsed = new Date(`${longMatch[2]} ${longMatch[1]}, ${longMatch[3]}`);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }
  const slashMatch = window.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function detectContractType(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\bstage\b|\binternship\b|\bintern\b/.test(lower)) return "Stage / Internship";
  if (/\balternance\b|\bapprentissage\b/.test(lower)) return "Alternance";
  if (/\bgraduate program\b/.test(lower)) return "Graduate Program";
  if (/\bcdi\b|\bfull[\s-]?time\b/.test(lower)) return "CDI / Full-time";
  if (/\bcdd\b|\bfixed[\s-]?term\b/.test(lower)) return "CDD / Fixed-term";
  return null;
}

function extractHeuristics(text: string, titleHint: string | null): Partial<ExtractedJobData> {
  const responsibilities = findSection(text, ["Responsibilities", "Missions", "What you'll do", "Le poste"]);
  const qualifications = findSection(text, ["Qualifications", "Requirements", "Profil recherché", "Skills required", "Ce que nous recherchons"]);
  return {
    title: titleHint,
    remoteType: detectRemoteType(text),
    responsibilities,
    qualifications,
    requiredSkills: normalizeSkillList(detectSkills(qualifications ?? text)),
    requiredLanguages: detectLanguages(text),
    requiredEducationLevel: detectEducationLevel(text),
    requiredExperienceYears: detectExperienceYears(text),
    ...detectSalary(text),
    durationMonths: detectDuration(text),
    deadline: detectDateNear(text, /deadline|apply by|closing date|date limite|candidater avant/i),
    startDate: detectDateNear(text, /start date|starting|d[ée]but (?:du|de la mission|souhait[ée])/i),
    contractType: detectContractType(text),
  };
}

export function extractJobPostingFromHtml(html: string): ExtractedJobData {
  const text = stripBoilerplateLines(htmlToText(html)).slice(0, MAX_RAW_TEXT);
  const titleHint = extractTitleTag(html);

  const structured = extractStructuredData(html);
  if (structured && (structured.title || structured.companyName || structured.description)) {
    const heuristics = extractHeuristics(structured.description ?? text, structured.title ?? titleHint);
    return {
      ...EMPTY,
      ...heuristics,
      ...structured,
      // Prefer structured salary/deadline when present, else the heuristic guess.
      salaryAmount: structured.salaryAmount ?? heuristics.salaryAmount ?? null,
      salaryCurrency: structured.salaryCurrency ?? heuristics.salaryCurrency ?? null,
      deadline: structured.deadline ?? heuristics.deadline ?? null,
      description: structured.description ?? text.slice(0, 2000),
      extractionMethod: "STRUCTURED_DATA",
      rawText: text,
    };
  }

  const heuristics = extractHeuristics(text, titleHint);
  return {
    ...EMPTY,
    ...heuristics,
    description: text.slice(0, 2000),
    extractionMethod: "HEURISTIC",
    rawText: text,
  };
}

export function extractJobPostingFromText(pastedText: string): ExtractedJobData {
  const text = pastedText.slice(0, MAX_RAW_TEXT);
  const heuristics = extractHeuristics(text, null);
  return {
    ...EMPTY,
    ...heuristics,
    description: text.slice(0, 2000),
    extractionMethod: "MANUAL_PASTE",
    rawText: text,
  };
}

export function educationLevelLabel(value: string | null): string {
  return EDUCATION_LEVELS.find((e) => e.value === value)?.label ?? "Non renseigné";
}
