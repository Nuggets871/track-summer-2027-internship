// Structured content of a CV tailored to one opportunity. Unlike the cover
// letter (free text, see CoverLetter.content), a CV needs real sections and
// bullet points so the Word/PDF export can lay it out properly — that is why
// GeneratedCv.content stores this shape as JSON.
//
// The type is deliberately small and provider-agnostic: the AI prompt returns
// the same shape, the studio edits it, and the export renders it.
//
// `normalizeCvContent` is the single boundary for anything untrusted (AI
// output, a stored row, a form edit) — it never throws and always returns a
// usable object, so a malformed payload degrades to an empty CV instead of
// breaking the page or the export.

export type CvEntry = {
  id: string;
  heading: string;
  meta: string | null;
  bullets: string[];
  tags: string[];
};

export type CvSection = {
  id: string;
  title: string;
  entries: CvEntry[];
};

export type CvContent = {
  headline: string | null;
  summary: string | null;
  sections: CvSection[];
};

export function emptyCvContent(): CvContent {
  return { headline: null, summary: null, sections: [] };
}

export function isCvEmpty(content: CvContent | null | undefined): boolean {
  if (!content) return true;
  return !content.headline?.trim() && !content.summary?.trim() && content.sections.every((section) => section.entries.length === 0);
}

/** Word count across every rendered field — used for the one-page nudge. */
export function countCvWords(content: CvContent): number {
  const parts: string[] = [];
  if (content.headline) parts.push(content.headline);
  if (content.summary) parts.push(content.summary);
  for (const section of content.sections) {
    parts.push(section.title);
    for (const entry of section.entries) {
      parts.push(entry.heading);
      if (entry.meta) parts.push(entry.meta);
      parts.push(...entry.bullets, ...entry.tags);
    }
  }
  return parts.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

const asString = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
}

function normalizeEntry(raw: unknown, sectionIndex: number, entryIndex: number): CvEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const heading = asString(record.heading) ?? asString(record.title) ?? "";
  const meta = asString(record.meta) ?? asString(record.subheading);
  const bullets = asStringArray(record.bullets);
  const tags = asStringArray(record.tags);
  if (!heading && bullets.length === 0 && tags.length === 0) return null;
  return { id: `s${sectionIndex}e${entryIndex}`, heading, meta, bullets, tags };
}

function normalizeSection(raw: unknown, index: number): CvSection | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const title = asString(record.title) ?? "";
  const entriesRaw = Array.isArray(record.entries) ? record.entries : [];
  const entries = entriesRaw
    .map((entry, entryIndex) => normalizeEntry(entry, index, entryIndex))
    .filter((entry): entry is CvEntry => entry !== null);
  if (!title && entries.length === 0) return null;
  return { id: `s${index}`, title: title || "Section", entries };
}

/** The one safe entry point for turning unknown data into a CvContent. */
export function normalizeCvContent(raw: unknown): CvContent {
  if (typeof raw !== "object" || raw === null) return emptyCvContent();
  const record = raw as Record<string, unknown>;
  const sectionsRaw = Array.isArray(record.sections) ? record.sections : [];
  const sections = sectionsRaw
    .map((section, index) => normalizeSection(section, index))
    .filter((section): section is CvSection => section !== null);
  return {
    headline: asString(record.headline),
    summary: asString(record.summary),
    sections,
  };
}

/** Parses a stored JSON string; returns null when absent, so the UI can tell
 * "no CV yet" apart from "an empty CV". */
export function parseCvContent(value: string | null | undefined): CvContent | null {
  if (!value) return null;
  try {
    return normalizeCvContent(JSON.parse(value));
  } catch {
    return null;
  }
}
