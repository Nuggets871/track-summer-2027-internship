// Word-boundary internship detection (avoids the classic false positives
// "internal" / "international" / "backstage").
const INTERNSHIP_PATTERNS: RegExp[] = [
  /\binterns?\b/i,
  /\binternships?\b/i,
  /\bstagiaires?\b/i,
  /\bstages?\b/i,
  /\bco-?op\b/i,
  /\bapprentices?(?:hip)?\b/i,
  /\balternances?\b/i,
  /\balternants?\b/i,
  /\bworking students?\b/i,
  /\bwerkstudent(?:in)?\b/i,
  /\bpraktik(?:um|ant(?:in)?)\b/i,
  /\bpr[áa]cticas\b/i,
  /\btirocinio\b/i,
  /\bsummer analysts?\b/i,
  /\bgraduate (?:program|scheme|programme|analyst|engineer)\b/i,
  /\bplacement (?:year|student)\b/i,
];

export function looksLikeInternship(text: string): boolean {
  return INTERNSHIP_PATTERNS.some((pattern) => pattern.test(text));
}
