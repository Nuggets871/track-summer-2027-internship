import { countCvWords, CV_ONE_PAGE_WORDS, type CvContent } from "@/lib/cv-content";

export type CvStyleWarning = {
  id: string;
  label: string;
  detail: string;
};

// Words that show up on almost every CV and therefore carry no information.
// Flagged so the candidate replaces them with a concrete fact.
const GENERIC_CLICHES = [
  /dynamique et motiv/i,
  /esprit d['’]équipe/i,
  /polyvalent/i,
  /passionné/i,
  /rigoureux/i,
  /team player/i,
  /hard[- ]?working/i,
  /excellent relationnel/i,
];

/**
 * A transparent, deterministic quality check on a generated CV — deliberately
 * not an unreliable "AI detector". It only points at concrete habits to fix.
 */
export function inspectCvStyle(content: CvContent): CvStyleWarning[] {
  const warnings: CvStyleWarning[] = [];
  const text = [
    content.headline ?? "",
    content.summary ?? "",
    ...content.sections.flatMap((section) => [section.title, ...section.entries.flatMap((entry) => [entry.heading, entry.meta ?? "", ...entry.bullets, ...entry.tags])]),
  ].join("\n");

  const emDashes = (text.match(/—/g) ?? []).length;
  if (emDashes > 0) warnings.push({ id: "em-dash", label: "Tiret cadratin", detail: `${emDashes} trouvé${emDashes > 1 ? "s" : ""}. Préfère une ponctuation naturelle.` });

  const clichés = GENERIC_CLICHES.filter((pattern) => pattern.test(text)).length;
  if (clichés > 0) warnings.push({ id: "cliches", label: "Formule creuse", detail: `${clichés} terme${clichés > 1 ? "s" : ""} sans information concrète (dynamique, polyvalent...). Remplace par un fait.` });

  const bullets = content.sections.flatMap((section) => section.entries.flatMap((entry) => entry.bullets));
  const longBullet = bullets.find((bullet) => bullet.split(/\s+/).filter(Boolean).length > 28);
  if (longBullet) warnings.push({ id: "long-bullet", label: "Puce trop longue", detail: "Au moins une puce dépasse 28 mots. Coupe-la en deux pour rester lisible." });

  const words = countCvWords(content);
  if (words > CV_ONE_PAGE_WORDS) warnings.push({ id: "length", label: "CV trop long", detail: `${words} mots : au-delà de ${CV_ONE_PAGE_WORDS}, le texte est réduit pour tenir sur une page. Écarte les puces les moins pertinentes pour cette offre.` });

  if (!content.summary?.trim()) warnings.push({ id: "summary", label: "Accroche absente", detail: "Ajoute un résumé de 2-3 phrases en tête, spécifique à l'offre." });

  return warnings;
}
