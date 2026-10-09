// Curates a generated CV so it shows less and only what matters for the offer
// being targeted. The AI is already asked to order content by relevance; this
// is the deterministic safety net that enforces the caps (so a chatty model
// cannot dump the whole profile) and keeps only the skills the offer asks for.
//
// It never invents anything and never throws: it only removes entries, bullets
// and tags from the structured content produced upstream.

import { aliasesForSkill, skillKey } from "@/lib/skill-normalization";
import type { CvContent, CvEntry, CvSection } from "@/lib/cv-content";

export type CvSelectionContext = {
  /** Skills the offer requires (from the job analysis). */
  requiredSkills: string[];
};

// How many entries to keep per section, based on what the section is about.
// Experience, projects and education are the ones worth cutting; skills and
// languages are compact and stay useful, so they are kept whole.
function entryLimit(title: string): number {
  const normalized = normalize(title);
  if (/experience|stage|internship|professionnel|professional|emploi|work|poste/.test(normalized)) return 3;
  if (/projet|project|realisation/.test(normalized)) return 2;
  if (/formation|education|diplome|degree|etude|study/.test(normalized)) return 2;
  if (/interet|interest|loisir|hobby|centre/.test(normalized)) return 3;
  if (/competence|skill|technolog|outil|tool|stack|langue|language/.test(normalized)) return 8;
  return 3;
}

function isSkillSection(title: string): boolean {
  return /competence|skill|technolog|outil|tool|stack|langue|language/.test(normalize(title));
}

const MAX_BULLETS_PER_ENTRY = 3;
const MAX_TAGS_PER_ENTRY = 8;
const MAX_SECTIONS = 4;

function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word/phrase match, so the "C" skill does not match every "c". */
function containsTerm(text: string, term: string): boolean {
  if (!term) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text);
}

function relevanceTerms(requiredSkills: string[]): string[] {
  const terms = new Set<string>();
  for (const skill of expandSkills(requiredSkills)) {
    for (const alias of aliasesForSkill(skill)) {
      const term = normalize(alias).trim();
      if (term.length >= 2) terms.add(term);
    }
  }
  return [...terms];
}

/**
 * "Linux/Unix" really means Linux or Unix, so each slash-separated alternative
 * is matched on its own. This keeps a "Linux" tag when the offer asks for
 * "Linux/Unix", without ever equating distinct skills like C and C++.
 */
function expandSkills(skills: string[]): string[] {
  const expanded = new Set<string>();
  for (const skill of skills) {
    for (const part of skill.split(/\s*\/\s*/)) {
      const trimmed = part.trim();
      if (trimmed) expanded.add(trimmed);
    }
  }
  return [...expanded];
}

function entryText(entry: CvEntry): string {
  return normalize([entry.heading, entry.meta ?? "", ...entry.bullets, ...entry.tags].join(" \n "));
}

function scoreEntry(entry: CvEntry, terms: string[]): number {
  const text = entryText(entry);
  let score = 0;
  for (const term of terms) {
    if (containsTerm(text, term)) score += term.includes(" ") ? 3 : 1;
  }
  // A bullet that names an offer skill is a strong relevance signal.
  for (const bullet of entry.bullets) {
    const text = normalize(bullet);
    if (terms.some((term) => containsTerm(text, term))) score += 1;
  }
  return score;
}

/** Keeps the most offer-relevant entries of a section, in their original order. */
function selectEntries(section: CvSection, terms: string[]): CvEntry[] {
  const limit = entryLimit(section.title);
  return section.entries
    .map((entry, index) => ({ entry, index, score: scoreEntry(entry, terms) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map(({ entry }) => entry);
}

function trimEntry(entry: CvEntry): CvEntry {
  return {
    ...entry,
    bullets: entry.bullets.slice(0, MAX_BULLETS_PER_ENTRY),
    tags: entry.tags.slice(0, MAX_TAGS_PER_ENTRY),
  };
}

/**
 * Drops tags the offer does not ask for, then removes skill categories that
 * became empty. When no tag matches at all (offer without skill extraction),
 * the original tags are kept so the CV is never stripped of its skills.
 */
function filterTags(entries: CvEntry[], requiredKeys: Set<string>): CvEntry[] {
  if (requiredKeys.size === 0) return entries;
  const hasMatch = entries.some((entry) => entry.tags.some((tag) => requiredKeys.has(skillKey(tag))));
  if (!hasMatch) return entries;
  return entries
    .map((entry) => ({ ...entry, tags: entry.tags.filter((tag) => requiredKeys.has(skillKey(tag))) }))
    .filter((entry) => entry.tags.length > 0 || entry.bullets.length > 0);
}

export function selectRelevantCvContent(content: CvContent, ctx: CvSelectionContext): CvContent {
  const terms = relevanceTerms(ctx.requiredSkills);
  const requiredKeys = new Set(expandSkills(ctx.requiredSkills).map(skillKey));

  const sections: CvSection[] = [];
  for (const section of content.sections) {
    if (sections.length >= MAX_SECTIONS) break;
    const capped = selectEntries(section, terms).map(trimEntry);
    const entries = isSkillSection(section.title) ? filterTags(capped, requiredKeys) : capped;
    if (entries.length === 0) continue;
    sections.push({ ...section, entries });
  }

  return { ...content, sections };
}
