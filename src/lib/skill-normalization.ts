/**
 * Stable skill identities shared by extraction, profiles and matching.
 * Keep aliases deliberately precise: fuzzy string matching would incorrectly
 * equate skills such as Java and JavaScript.
 */
const SKILL_ALIASES: Record<string, string[]> = {
  "Angular": ["angular", "angularjs"],
  "TypeScript": ["typescript", "ts"],
  "JavaScript": ["javascript", "js", "ecmascript"],
  "HTML": ["html", "html5"],
  "CSS": ["css", "css3"],
  "React": ["react", "reactjs", "react.js"],
  "Vue.js": ["vue", "vuejs", "vue.js"],
  "Node.js": ["node", "nodejs", "node.js"],
  "Next.js": ["next", "nextjs", "next.js"],
  "NestJS": ["nest", "nestjs", "nest.js"],
  "Express": ["express", "expressjs", "express.js"],
  "REST APIs": ["rest api", "rest apis", "restful api", "restful apis"],
  "PostgreSQL": ["postgres", "postgresql"],
  "MySQL": ["mysql"],
  "SQL": ["sql"],
  "PL/SQL": ["pl/sql", "pl-sql", "plsql"],
  "MongoDB": ["mongo", "mongodb"],
  "Prisma": ["prisma", "prisma orm"],
  "Playwright": ["playwright"],
  "Spring Boot": ["spring boot", "springboot"],
  "PHP": ["php"],
  "Symfony": ["symfony"],
  "Python": ["python"],
  "Java": ["java"],
  "C": ["c language", "langage c"],
  "C++": ["c++", "cpp"],
  "C#": ["c#", "csharp"],
  "Git": ["git"],
  "Docker": ["docker"],
  "Kubernetes": ["kubernetes", "k8s"],
  "Linux": ["linux"],
  "Tailwind CSS": ["tailwind", "tailwind css", "tailwindcss"],
  "DaisyUI": ["daisyui", "daisy ui"],
  "GSAP": ["gsap", "greensock"],
  "Chart.js": ["chart.js", "chartjs"],
  "Power BI": ["power bi", "powerbi"],
  "Microsoft Office": ["microsoft office", "office suite", "ms office"],
  "JetBrains IDEs": ["jetbrains", "jetbrains ides"],
  "VMware": ["vmware"],
  "Agile": ["agile", "agile methods", "méthodes agiles"],
  "Scrum": ["scrum"],
  "Financial Modeling": ["financial modeling", "financial modelling", "modélisation financière"],
  "Data Analysis": ["data analysis", "analyse de données"],
};

function basicKey(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
  ALIAS_TO_CANONICAL.set(basicKey(canonical), canonical);
  for (const alias of aliases) ALIAS_TO_CANONICAL.set(basicKey(alias), canonical);
}

export function canonicalizeSkillName(value: string): string {
  const trimmed = value.trim();
  return ALIAS_TO_CANONICAL.get(basicKey(trimmed)) ?? trimmed;
}

export function skillKey(value: string): string {
  return basicKey(canonicalizeSkillName(value));
}

export function skillsEquivalent(left: string, right: string): boolean {
  return skillKey(left) === skillKey(right);
}

export function normalizeSkillList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const canonical = canonicalizeSkillName(value);
    const key = skillKey(canonical);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(canonical);
    }
  }
  return result;
}

export function aliasesForSkill(value: string): string[] {
  const canonical = canonicalizeSkillName(value);
  return [canonical, ...(SKILL_ALIASES[canonical] ?? [])];
}
