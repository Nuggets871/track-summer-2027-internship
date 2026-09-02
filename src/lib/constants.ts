// Central source of truth for every "enum-like" string field in the app.
// SQLite can't store native enums, and the brief asks for user-editable
// statuses, so these are plain string unions validated with zod at the
// boundaries (server actions) instead of DB-level enums.

export const DEFAULT_PIPELINE_STAGES = [
  { key: "TO_EXPLORE", label: "À explorer", color: "#94a3b8", order: 0 },
  { key: "TO_CONTACT", label: "À contacter", color: "#a78bfa", order: 1 },
  { key: "TO_PREPARE", label: "À préparer", color: "#818cf8", order: 2 },
  { key: "READY", label: "Candidature prête", color: "#60a5fa", order: 3 },
  { key: "SENT", label: "Candidature envoyée", color: "#38bdf8", order: 4 },
  { key: "FOLLOW_UP", label: "Relance à faire", color: "#fb923c", order: 5 },
  { key: "RESPONSE_RECEIVED", label: "Réponse reçue", color: "#facc15", order: 6 },
  { key: "ASSESSMENT", label: "Test / assessment", color: "#fbbf24", order: 7 },
  { key: "INTERVIEW_HR", label: "Entretien RH", color: "#4ade80", order: 8 },
  { key: "INTERVIEW_MANAGER", label: "Entretien manager", color: "#34d399", order: 9 },
  { key: "INTERVIEW_FINAL", label: "Entretien final", color: "#2dd4bf", order: 10 },
  { key: "OFFER", label: "Offer", color: "#22c55e", order: 11 },
  { key: "REJECTED", label: "Refus", color: "#f87171", order: 12 },
  { key: "GHOSTED", label: "Ghosted", color: "#71717a", order: 13 },
  { key: "ABANDONED", label: "Abandonné", color: "#57534e", order: 14 },
] as const;

// Stages considered "active pipeline" (not terminal) — used for stats.
export const TERMINAL_STAGE_KEYS = ["OFFER", "REJECTED", "GHOSTED", "ABANDONED"];
export const POSITIVE_TERMINAL_STAGE_KEYS = ["OFFER"];
export const INTERVIEW_STAGE_KEYS = [
  "ASSESSMENT",
  "INTERVIEW_HR",
  "INTERVIEW_MANAGER",
  "INTERVIEW_FINAL",
];
export const SENT_OR_LATER_STAGE_KEYS = [
  "SENT",
  "FOLLOW_UP",
  "RESPONSE_RECEIVED",
  ...INTERVIEW_STAGE_KEYS,
  "OFFER",
  "REJECTED",
  "GHOSTED",
];
export const RESPONSE_STAGE_KEYS = [
  "RESPONSE_RECEIVED",
  ...INTERVIEW_STAGE_KEYS,
  "OFFER",
  "REJECTED",
];

export const PRIORITY_LEVELS = [
  { value: "LOW", label: "Basse", color: "#94a3b8" },
  { value: "MEDIUM", label: "Moyenne", color: "#60a5fa" },
  { value: "HIGH", label: "Haute", color: "#fb923c" },
  { value: "DREAM", label: "Dream", color: "#f472b6" },
] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number]["value"];

export const TASK_PRIORITY_LEVELS = [
  { value: "LOW", label: "Basse", color: "#94a3b8" },
  { value: "MEDIUM", label: "Moyenne", color: "#60a5fa" },
  { value: "HIGH", label: "Haute", color: "#fb923c" },
  { value: "URGENT", label: "Urgente", color: "#f87171" },
] as const;

export const TASK_STATUSES = [
  { value: "TODO", label: "À faire" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "DONE", label: "Terminée" },
] as const;

export const TASK_RECURRENCES = [
  { value: "NONE", label: "Aucune" },
  { value: "DAILY", label: "Quotidienne" },
  { value: "WEEKLY", label: "Hebdomadaire" },
  { value: "MONTHLY", label: "Mensuelle" },
] as const;

export const CONTACT_TYPES = [
  { value: "RECRUITER", label: "Recruteur" },
  { value: "HR", label: "RH" },
  { value: "MANAGER", label: "Manager" },
  { value: "ALUMNI", label: "Alumni" },
  { value: "STUDENT", label: "Étudiant" },
  { value: "PROFESSOR", label: "Professeur" },
  { value: "PERSONAL", label: "Relation personnelle" },
  { value: "EMPLOYEE", label: "Employé" },
  { value: "FOUNDER", label: "Fondateur" },
  { value: "SPEAKER", label: "Intervenant" },
  { value: "OTHER", label: "Autre" },
] as const;

export const NETWORKING_STAGES = [
  { key: "IDENTIFIED", label: "À identifier", color: "#94a3b8", order: 0 },
  { key: "TO_CONTACT", label: "À contacter", color: "#a78bfa", order: 1 },
  { key: "CONTACTED", label: "Contacté", color: "#60a5fa", order: 2 },
  { key: "RESPONDED", label: "Réponse", color: "#38bdf8", order: 3 },
  { key: "CALL", label: "Call", color: "#facc15", order: 4 },
  { key: "ACTIVE_RELATION", label: "Relation active", color: "#4ade80", order: 5 },
  { key: "REFERRAL", label: "Referral", color: "#22c55e", order: 6 },
] as const;

export const INTERACTION_TYPES = [
  { value: "EMAIL", label: "Email" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "CALL", label: "Appel" },
  { value: "INTERVIEW", label: "Entretien" },
  { value: "MEETING", label: "Rencontre" },
  { value: "EVENT", label: "Événement" },
  { value: "RECOMMENDATION", label: "Recommandation" },
  { value: "STATUS_CHANGE", label: "Changement de statut" },
  { value: "NOTE", label: "Note" },
  { value: "OTHER", label: "Autre" },
] as const;

export const EVENT_TYPES = [
  { value: "DEADLINE", label: "Deadline", color: "#f87171" },
  { value: "FOLLOW_UP", label: "Relance", color: "#fb923c" },
  { value: "INTERVIEW", label: "Entretien", color: "#4ade80" },
  { value: "NETWORKING_CALL", label: "Call networking", color: "#38bdf8" },
  { value: "FAIR", label: "Salon / événement", color: "#a78bfa" },
  { value: "VISA_DEADLINE", label: "Date limite visa", color: "#facc15" },
  { value: "PERSONAL", label: "Personnel", color: "#94a3b8" },
  { value: "OTHER", label: "Autre", color: "#71717a" },
] as const;

export const DOCUMENT_CATEGORIES = [
  { value: "CV", label: "CV" },
  { value: "COVER_LETTER", label: "Lettre de motivation" },
  { value: "TRANSCRIPT", label: "Relevé de notes" },
  { value: "PORTFOLIO", label: "Portfolio" },
  { value: "RECOMMENDATION", label: "Lettre de recommandation" },
  { value: "VISA", label: "Document visa" },
  { value: "OTHER", label: "Autre" },
] as const;

export const COVER_LETTER_STATUSES = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "TO_REVIEW", label: "À relire" },
  { value: "READY", label: "Prête" },
  { value: "SENT", label: "Envoyée" },
] as const;

export const INTERVIEW_FORMATS = [
  { value: "VIDEO", label: "Visio" },
  { value: "PHONE", label: "Téléphone" },
  { value: "ONSITE", label: "Sur site" },
] as const;

export const INTERVIEW_STATUSES = [
  { value: "SCHEDULED", label: "Planifié" },
  { value: "DONE", label: "Terminé" },
  { value: "CANCELLED", label: "Annulé" },
] as const;

export const QUESTION_CATEGORIES = [
  { value: "BEHAVIORAL", label: "Comportementale" },
  { value: "TECHNICAL", label: "Technique" },
  { value: "TO_ASK", label: "À poser" },
] as const;

export const QUESTION_STATUSES = [
  { value: "TO_PREPARE", label: "À préparer", color: "#94a3b8" },
  { value: "IN_PROGRESS", label: "En cours", color: "#facc15" },
  { value: "MASTERED", label: "Maîtrisé", color: "#22c55e" },
] as const;

export const WISHLIST_CATEGORIES = [
  { value: "DREAM", label: "Dream", color: "#f472b6" },
  { value: "HIGH_PRIORITY", label: "High Priority", color: "#fb923c" },
  { value: "TARGET", label: "Target", color: "#60a5fa" },
  { value: "BACKUP", label: "Backup", color: "#94a3b8" },
  { value: "EXPLORATORY", label: "Exploratory", color: "#a78bfa" },
] as const;

export const RESEARCH_CATEGORIES = [
  { value: "COMPANY", label: "Entreprise" },
  { value: "PROGRAM", label: "Programme" },
  { value: "ARTICLE", label: "Article" },
  { value: "RANKING", label: "Classement" },
  { value: "VISA_ADVICE", label: "Conseils visa" },
  { value: "CITY", label: "Ville" },
  { value: "SALARY", label: "Salaire" },
  { value: "PERSON", label: "Personne" },
  { value: "PLATFORM", label: "Plateforme" },
  { value: "OTHER", label: "Autre" },
] as const;

export const OFFER_STATUSES = [
  { value: "PENDING", label: "En attente" },
  { value: "ACCEPTED", label: "Acceptée" },
  { value: "DECLINED", label: "Déclinée" },
] as const;

export const DEFAULT_SOURCES = [
  "LinkedIn",
  "Site entreprise",
  "Candidature spontanée",
  "Networking",
  "Alumni",
  "Cabinet de recrutement",
  "Événement / salon",
  "Recommandation",
  "Job board",
  "Autre",
];

export const DEFAULT_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "SGD", "AED", "CAD", "AUD", "HKD"];

export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

export const COMPANY_TYPES = [
  "Startup",
  "Scale-up",
  "PME",
  "Grand groupe",
  "Banque",
  "Cabinet de conseil",
  "Cabinet d'avocats",
  "ONG / Institution",
  "Agence",
  "Autre",
];

export const DEFAULT_PRIORITY_WEIGHTS = {
  interest: 25,
  deadlineProximity: 20,
  fit: 20,
  probability: 15,
  relationship: 10,
  staleness: -10,
};

export function labelFor<T extends { value: string; label: string }>(
  options: readonly T[],
  value: string | null | undefined,
): string {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

export function colorFor<T extends { value: string; color?: string }>(
  options: readonly T[],
  value: string | null | undefined,
  fallback = "#94a3b8",
): string {
  return options.find((o) => o.value === value)?.color ?? fallback;
}

// ---------------------------------------------------------------------------
// Job import — extraction, matching & eligibility ("Add by link" workflow)
// ---------------------------------------------------------------------------

// Ordered so index = rank, used to compare "does the candidate meet the bar".
export const EDUCATION_LEVELS = [
  { value: "HIGH_SCHOOL", label: "Lycée / Bac" },
  { value: "ASSOCIATE", label: "Bac+2 (BTS/DUT)" },
  { value: "BACHELOR", label: "Licence / Bachelor (Bac+3)" },
  { value: "MASTER", label: "Master / MBA (Bac+5)" },
  { value: "PHD", label: "Doctorat / PhD" },
] as const;

export const LANGUAGE_LEVELS = [
  { value: "BASIC", label: "Basique" },
  { value: "INTERMEDIATE", label: "Intermédiaire" },
  { value: "ADVANCED", label: "Avancé" },
  { value: "FLUENT", label: "Courant" },
  { value: "NATIVE", label: "Natif" },
] as const;

export const COMMON_LANGUAGES = [
  "Anglais",
  "Français",
  "Allemand",
  "Espagnol",
  "Italien",
  "Mandarin",
  "Cantonais",
  "Arabe",
  "Portugais",
  "Néerlandais",
  "Japonais",
  "Coréen",
  "Russe",
] as const;

// Curated, extensible keyword list scanned in job descriptions to build
// requiredSkills — genuinely detected (word-boundary match), never guessed.
export const MASTER_SKILLS = [
  "Excel",
  "PowerPoint",
  "Word",
  "VBA",
  "Python",
  "SQL",
  "R",
  "Java",
  "JavaScript",
  "TypeScript",
  "React",
  "Bloomberg",
  "Capital IQ",
  "Financial Modeling",
  "Modélisation financière",
  "Valorisation",
  "DCF",
  "LBO",
  "Comptabilité",
  "Audit",
  "IFRS",
  "Power BI",
  "Tableau",
  "Machine Learning",
  "Data Analysis",
  "Analyse de données",
  "PowerPoint",
  "Négociation",
  "Gestion de projet",
  "Salesforce",
  "SAP",
  "AutoCAD",
  "Photoshop",
  "SEO",
  "Google Analytics",
  "C++",
  "C#",
  "AWS",
  "Docker",
  "Git",
] as const;

export const EXTRACTION_METHODS = [
  { value: "STRUCTURED_DATA", label: "Données structurées de la page" },
  { value: "AI_ENHANCED", label: "Analyse IA + données structurées" },
  { value: "HEURISTIC", label: "Analyse du texte de la page" },
  { value: "MANUAL_PASTE", label: "Texte collé manuellement" },
] as const;

export const ELIGIBILITY_STATUSES = [
  { value: "LIKELY_ELIGIBLE", label: "Probablement éligible", color: "#22c55e" },
  { value: "POSSIBLY_NOT_ELIGIBLE", label: "Possiblement non éligible", color: "#f87171" },
  { value: "UNCLEAR", label: "Incertain", color: "#94a3b8" },
] as const;

export const JOB_IMPORT_ACTIONS = [
  { value: "SAVE_LATER", label: "Sauvegarder pour plus tard" },
  { value: "ALREADY_APPLIED", label: "J'ai déjà candidaté" },
  { value: "PREPARE", label: "Préparer ma candidature" },
] as const;

export const DEFAULT_MATCH_WEIGHTS = {
  skills: 30,
  experience: 25,
  education: 15,
  languages: 10,
  location: 10,
  preferences: 10,
};

export function matchLabel(score: number): string {
  if (score >= 85) return "Excellent match";
  if (score >= 70) return "Très bon match";
  if (score >= 55) return "Bon match";
  if (score >= 40) return "Match moyen";
  return "Match faible";
}
