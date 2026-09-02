// Turns a RawSourceJob (whatever a provider fetched) into a NormalizedJob
// ready to persist. Structured facts the source gave us directly (title,
// company, location, posted date) are kept as-is — authoritative. Everything
// that has to be *read out of* the description (skills, languages, salary,
// education level...) reuses the exact same heuristic extractor already
// proven for the "paste a link" workflow (job-extraction.ts), rather than a
// second, divergent set of regexes.

import { htmlToText, extractJobPostingFromText } from "@/lib/job-extraction";
import { looksLikeInternship, guessSector, splitLocation } from "@/lib/discover/classify";
import type { RawSourceJob, NormalizedJob } from "@/lib/discover/types";

const MAX_RAW_TEXT = 8000;

export function normalizeRawJob(raw: RawSourceJob): NormalizedJob {
  const plainDescription = raw.description ? htmlToText(raw.description) : null;
  const heuristics = extractJobPostingFromText(plainDescription || raw.title);

  const { cityName, countryName } = splitLocation(raw.locationText);
  const isInternship = looksLikeInternship(raw.title, raw.departmentOrTeam);
  const sector = guessSector(raw.title, raw.departmentOrTeam);

  return {
    sourceJobId: raw.sourceJobId,
    sourceUrl: raw.sourceUrl,
    title: raw.title,
    companyName: raw.companyName,
    description: plainDescription ? plainDescription.slice(0, 4000) : null,
    rawText: (plainDescription || raw.title).slice(0, MAX_RAW_TEXT),
    cityName,
    countryName,
    remoteType: raw.remoteType,
    sector,
    contractType: raw.contractType,
    isInternship,
    postedAt: raw.postedAt,
    durationMonths: heuristics.durationMonths,
    salaryAmount: heuristics.salaryAmount,
    salaryCurrency: heuristics.salaryCurrency,
    requiredEducationLevel: heuristics.requiredEducationLevel,
    requiredExperienceYears: heuristics.requiredExperienceYears,
    requiredSkills: heuristics.requiredSkills,
    requiredLanguages: heuristics.requiredLanguages,
    visaSponsorship: detectVisaSponsorship(plainDescription || ""),
    tags: buildTags({ isInternship, remoteType: raw.remoteType, contractType: raw.contractType, sector }),
  };
}

function detectVisaSponsorship(text: string): boolean | null {
  const lower = text.toLowerCase();
  if (/no (visa )?sponsorship|sponsorship is not (available|provided)|must be authorized to work/.test(lower)) return false;
  if (/visa sponsorship (available|provided)|we sponsor visas|sponsorship available/.test(lower)) return true;
  return null;
}

function buildTags(input: {
  isInternship: boolean;
  remoteType: NormalizedJob["remoteType"];
  contractType: string | null;
  sector: string | null;
}): string[] {
  const tags: string[] = [];
  if (input.isInternship) tags.push("Internship");
  if (input.remoteType) tags.push(input.remoteType === "REMOTE" ? "Remote" : input.remoteType === "HYBRID" ? "Hybrid" : "On-site");
  if (input.contractType) tags.push(input.contractType);
  if (input.sector) tags.push(input.sector);
  // A source's own contractType can legitimately be "Internship" too (e.g.
  // Lever's `commitment` category) — dedupe case-insensitively so the same
  // badge never renders (and gets keyed) twice.
  const seen = new Set<string>();
  return tags.filter((t) => {
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
