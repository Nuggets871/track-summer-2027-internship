export type StyleWarning = {
  id: string;
  label: string;
  detail: string;
};

const GENERIC_CLICHES = [
  /c['’]est avec (?:un )?grand intérêt/i,
  /je me permets de/i,
  /fort(?:e)? de mon expérience/i,
  /mon profil correspond parfaitement/i,
  /véritable atout/i,
  /mettre mes compétences à profit/i,
  /relever de nouveaux défis/i,
  /résonne particulièrement/i,
  /environnement en constante évolution/i,
  /I am writing to express my interest/i,
  /perfect fit/i,
];

/** A transparent style check, deliberately not an unreliable “AI detector”. */
export function inspectCoverLetterStyle(text: string, companyName?: string): StyleWarning[] {
  const warnings: StyleWarning[] = [];
  const emDashes = (text.match(/—/g) ?? []).length;
  if (emDashes > 0) warnings.push({ id: "em-dash", label: "Tiret cadratin", detail: `${emDashes} trouvé${emDashes > 1 ? "s" : ""}. Préfère une ponctuation naturelle.` });

  if (/(?:ce n['’]est|il ne s['’]agit|it['’]s not|not only).{0,80}(?:mais|c['’]est|it['’]s|but also)/i.test(text)) {
    warnings.push({ id: "negative-parallelism", label: "Opposition artificielle", detail: "Évite la construction « ce n’est pas X, c’est Y » si elle n’apporte rien." });
  }

  const clichés = GENERIC_CLICHES.filter((pattern) => pattern.test(text)).length;
  if (clichés > 0) warnings.push({ id: "cliches", label: "Formule générique", detail: `${clichés} tournure${clichés > 1 ? "s" : ""} interchangeable${clichés > 1 ? "s" : ""} à remplacer par un fait précis.` });

  const allowedTransitions = ["de plus", "par ailleurs", "en outre", "ainsi", "therefore", "furthermore"];
  const repeated = allowedTransitions.find((word) => (text.toLowerCase().match(new RegExp(word, "g")) ?? []).length > 1);
  if (repeated) warnings.push({ id: "transitions", label: "Transitions répétitives", detail: `« ${repeated} » revient plusieurs fois.` });

  const sentences = text.split(/[.!?]+/).map((sentence) => sentence.trim()).filter(Boolean);
  if (sentences.some((sentence) => sentence.split(/\s+/).length > 35)) {
    warnings.push({ id: "long-sentence", label: "Phrase trop longue", detail: "Au moins une phrase dépasse 35 mots. Coupe-la pour gagner en naturel." });
  }

  if (companyName && !text.toLocaleLowerCase().includes(companyName.toLocaleLowerCase())) {
    warnings.push({ id: "company", label: "Entreprise peu spécifique", detail: "Le nom de l’entreprise n’apparaît pas. Vérifie que la lettre ne pourrait pas être envoyée ailleurs telle quelle." });
  }
  return warnings;
}
