import type { AppProfile } from "@/lib/data/profile";
import type { AppSettings } from "@/lib/data/settings";
import type { SearchQuery } from "@/lib/search/types";

const COUNTRY_CODES: Record<string, string> = {
  "royaume-uni": "gb", "france": "fr", "allemagne": "de", "suisse": "ch", "pays-bas": "nl",
  "singapour": "sg", "états-unis": "us", "etats-unis": "us", "canada": "ca", "irlande": "ie",
  "espagne": "es", "italie": "it", "suède": "se", "suede": "se", "belgique": "be",
  "autriche": "at", "luxembourg": "lu", "danemark": "dk", "norvège": "no", "norway": "no",
  "australie": "au", "nouvelle-zélande": "nz", "inde": "in", "pologne": "pl", "portugal": "pt",
};

const DEFAULT_COUNTRIES = ["Royaume-Uni", "France", "Allemagne", "Suisse", "Pays-Bas", "Singapour", "États-Unis"];

export function countryCodeFor(name: string): string | null {
  return COUNTRY_CODES[name.trim().toLowerCase()] ?? null;
}

/** A short role phrase derived from the profile, used as the search backbone. */
export function roleFromProfile(profile: AppProfile): string {
  const candidates = [profile.headline, ...profile.experiences.map((experience) => experience.title)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const cleaned = candidate
      .replace(/\b(apprentice|apprenticeship|intern|internship|student|stagiaire|alternant(?:e)?|working)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length >= 3) return cleaned;
  }
  return profile.fieldOfStudy ?? "software engineer";
}

/**
 * Builds the search queries automatically from the profile and preferences —
 * no per-source configuration. One query per preferred country, plus a
 * remote one.
 */
export function buildSearchQueries(profile: AppProfile, settings: AppSettings, roleOverride?: string): SearchQuery[] {
  const role = (roleOverride?.trim() || roleFromProfile(profile)).trim();
  const countries = (settings.preferredCountries.length ? settings.preferredCountries : DEFAULT_COUNTRIES).slice(0, 6);

  const queries: SearchQuery[] = countries.map((name) => ({
    keywords: `${role} internship`,
    countryCode: countryCodeFor(name),
    countryName: name,
    remote: false,
  }));

  queries.push({ keywords: `${role} internship remote`, countryCode: null, countryName: null, remote: true });
  return queries;
}
