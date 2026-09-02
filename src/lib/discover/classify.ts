// Deterministic, keyword-based classification — no AI, no invention. Runs on
// every ingested job so company-board sources (which list every role, not
// just internships) can be filtered down to what this app is actually for.

// Word-boundary matched (never plain substring) — "intern" and "stage" as
// bare substrings would otherwise false-positive on "internal",
// "international", "internet", "backstage", "vintage"... which a real
// company board (see GitLab's own "Senior Internal Auditor") will contain.
const INTERNSHIP_KEYWORDS = [
  "intern",
  "internship",
  "interns",
  "stagiaire",
  "stagiaires",
  "stage",
  "co-op",
  "coop",
  "working student",
  "werkstudent",
  "apprenti",
  "apprentie",
  "apprentice",
  "summer analyst",
  "summer associate",
  "graduate program",
  "graduate scheme",
  "new grad",
];

const EXCLUDE_KEYWORDS = ["senior", "staff", "principal", "director", "vp", "vice president", "head of", "lead"];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWholeWord(haystack: string, phrase: string): boolean {
  const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(phrase)}(?![a-z0-9])`, "i");
  return pattern.test(haystack);
}

export function looksLikeInternship(title: string, departmentOrTeam: string | null): boolean {
  const haystack = `${title} ${departmentOrTeam ?? ""}`.toLowerCase();
  if (EXCLUDE_KEYWORDS.some((k) => containsWholeWord(haystack, k))) return false;
  return INTERNSHIP_KEYWORDS.some((k) => containsWholeWord(haystack, k));
}

/** Very small set of sector keywords to tag a listing from its title/team —
 * kept intentionally short and literal (no ML, no guessing). Absent when no
 * keyword matches, never forced to a default. */
const SECTOR_KEYWORDS: { sector: string; keywords: string[] }[] = [
  { sector: "Finance", keywords: ["finance", "banking", "investment", "trading", "markets", "asset management", "private equity"] },
  { sector: "Tech", keywords: ["software", "engineering", "developer", "data", "machine learning", "product", "it"] },
  { sector: "Conseil", keywords: ["consulting", "strategy", "advisory"] },
  { sector: "Luxe", keywords: ["luxury", "fashion", "retail merchandising"] },
  { sector: "Marketing", keywords: ["marketing", "growth", "brand", "communications"] },
  { sector: "Droit", keywords: ["legal", "law", "compliance", "regulatory"] },
  { sector: "RH", keywords: ["human resources", "people", "talent", "recruiting"] },
];

export function guessSector(title: string, departmentOrTeam: string | null): string | null {
  const haystack = `${title} ${departmentOrTeam ?? ""}`.toLowerCase();
  for (const { sector, keywords } of SECTOR_KEYWORDS) {
    if (keywords.some((k) => containsWholeWord(haystack, k))) return sector;
  }
  return null;
}

/** Splits a free-form "City, Country" / "City, ST, Country" / "Remote"
 * location string into cityName/countryName — best-effort, never guesses a
 * country that isn't actually named. */
export function splitLocation(locationText: string | null): { cityName: string | null; countryName: string | null } {
  if (!locationText || !locationText.trim()) return { cityName: null, countryName: null };
  const cleaned = locationText.replace(/\(.*?\)/g, "").trim();
  if (/^remote$/i.test(cleaned)) return { cityName: null, countryName: null };
  const parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { cityName: null, countryName: null };
  if (parts.length === 1) return { cityName: null, countryName: parts[0] };
  return { cityName: parts[0], countryName: parts[parts.length - 1] };
}
