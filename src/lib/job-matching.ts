// Explainable job-match scoring and eligibility checking — deliberately
// rule-based rather than "an AI number". Every dimension is a documented,
// deterministic comparison between the candidate profile and the extracted
// job requirements, so the breakdown always adds up and is reproducible.
//
// Eligibility is kept strictly separate from "fit": a job can be a great
// match for your interests while you're not (yet) eligible for it, and vice
// versa. Eligibility is always hedged ("likely" / "unclear") — it never
// claims certainty from an ambiguous job posting.

import { EDUCATION_LEVELS, LANGUAGE_LEVELS, matchLabel } from "@/lib/constants";
import { clamp } from "@/lib/utils";
import { skillKey } from "@/lib/skill-normalization";

export type ScoreFactor = {
  key: string;
  label: string;
  /** Raw factor value, already normalized to 0-100. */
  value: number;
  /** Weight applied to this factor (not necessarily summing to 100 across factors). */
  weight: number;
  /** weight * value / 100 — this factor's actual contribution to the total. */
  contribution: number;
};

export type ScoreResult = {
  total: number; // 0-100
  factors: ScoreFactor[];
};

export type ProfileLanguage = { language: string; level: string; detail?: string | null };

export type ProfileForMatching = {
  educationLevel: string | null;
  graduationYear: number | null;
  yearsOfExperience: number;
  skills: string[];
  languages: ProfileLanguage[];
  workAuthorization: string | null;
  availabilityNote: string | null;
  availabilityStart?: Date | null;
  availabilityEnd?: Date | null;
  minDurationWeeks?: number | null;
  maxDurationWeeks?: number | null;
};

export type JobForMatching = {
  requiredSkills: string[];
  requiredLanguages: string[];
  requiredEducationLevel: string | null;
  requiredExperienceYears: number | null;
  countryName: string | null;
  remoteType: "REMOTE" | "HYBRID" | "ONSITE" | null;
  sector: string | null;
  rawText: string;
  requiredStartDate?: Date | null;
  requiredEndDate?: Date | null;
  durationWeeks?: number | null;
};

export type MatchWeights = {
  skills: number;
  experience: number;
  education: number;
  languages: number;
  location: number;
  preferences: number;
};

export type MatchResult = ScoreResult & {
  strengths: string[];
  watchouts: string[];
  missingSkills: string[];
  recommendation: string;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

function educationRank(value: string | null): number {
  if (!value) return -1;
  return EDUCATION_LEVELS.findIndex((e) => e.value === value);
}

function languageRank(value: string | null): number {
  if (!value) return -1;
  return LANGUAGE_LEVELS.findIndex((l) => l.value === value);
}

const MIN_ACCEPTABLE_LANGUAGE_RANK = LANGUAGE_LEVELS.findIndex((l) => l.value === "ADVANCED");

export function computeJobMatch(
  profile: ProfileForMatching,
  job: JobForMatching,
  weights: MatchWeights,
  context: { preferredCountries: string[]; preferredSectors: string[] },
): MatchResult {
  const strengths: string[] = [];
  const watchouts: string[] = [];

  // --- Skills ---------------------------------------------------------
  const profileSkillKeys = new Set(profile.skills.map(skillKey));
  const matchedSkills = job.requiredSkills.filter((s) => profileSkillKeys.has(skillKey(s)));
  const missingSkills = job.requiredSkills.filter((s) => !profileSkillKeys.has(skillKey(s)));
  const skillsScore =
    job.requiredSkills.length === 0 ? 65 : clamp((matchedSkills.length / job.requiredSkills.length) * 100, 0, 100);
  if (matchedSkills.length > 0) strengths.push(`Compétences en ${matchedSkills.join(", ")} correspondant aux attentes`);
  for (const skill of missingSkills) watchouts.push(`${skill} demandé mais pas encore dans ton profil`);

  // --- Experience -------------------------------------------------------
  let experienceScore: number;
  if (job.requiredExperienceYears === null) {
    experienceScore = 75;
  } else if (job.requiredExperienceYears === 0) {
    experienceScore = 100;
  } else {
    experienceScore = clamp((profile.yearsOfExperience / job.requiredExperienceYears) * 100, 0, 100);
    if (profile.yearsOfExperience >= job.requiredExperienceYears) {
      strengths.push("Expérience professionnelle suffisante pour ce poste");
    } else {
      watchouts.push(`${job.requiredExperienceYears} an(s) d'expérience demandé(s), profil actuel en dessous`);
    }
  }

  // --- Education ----------------------------------------------------------
  const requiredEduRank = educationRank(job.requiredEducationLevel);
  const profileEduRank = educationRank(profile.educationLevel);
  let educationScore: number;
  if (requiredEduRank === -1) {
    educationScore = 90;
  } else if (profileEduRank === -1) {
    educationScore = 50;
  } else if (profileEduRank >= requiredEduRank) {
    educationScore = 100;
    strengths.push("Formation cohérente avec l'offre");
  } else if (profileEduRank === requiredEduRank - 1) {
    educationScore = 55;
    watchouts.push("Niveau de formation légèrement en dessous de celui demandé");
  } else {
    educationScore = 25;
    watchouts.push("Niveau de formation en dessous de celui demandé");
  }

  // --- Languages ------------------------------------------------------
  let languagesScore: number;
  if (job.requiredLanguages.length === 0) {
    languagesScore = 100;
  } else {
    const satisfied = job.requiredLanguages.filter((lang) =>
      profile.languages.some((pl) => norm(pl.language) === norm(lang) && languageRank(pl.level) >= MIN_ACCEPTABLE_LANGUAGE_RANK),
    );
    languagesScore = clamp((satisfied.length / job.requiredLanguages.length) * 100, 0, 100);
    for (const lang of satisfied) {
      if (norm(lang) === "anglais") strengths.push("Bon niveau d'anglais");
    }
    for (const lang of job.requiredLanguages) {
      if (!satisfied.includes(lang)) watchouts.push(`Niveau en ${lang} à confirmer par rapport à l'offre`);
    }
  }

  // --- Location / availability -----------------------------------------
  let locationScore: number;
  if (job.remoteType === "REMOTE") {
    locationScore = 100;
  } else if (job.countryName && context.preferredCountries.some((c) => norm(c) === norm(job.countryName!))) {
    locationScore = 100;
  } else if (job.countryName) {
    locationScore = profile.availabilityNote ? 60 : 50;
  } else {
    locationScore = 70;
  }

  // --- Personal preferences (sector) --------------------------------------
  let preferencesScore: number;
  if (context.preferredSectors.length === 0) {
    preferencesScore = 60;
  } else if (job.sector && context.preferredSectors.some((s) => norm(s) === norm(job.sector!))) {
    preferencesScore = 100;
  } else {
    preferencesScore = 35;
  }

  // Unknown requirements must not silently become positive evidence. Only
  // dimensions for which the posting gives us something concrete contribute
  // to the estimate; this avoids a precise-looking score built from defaults.
  const rawFactors: Omit<ScoreFactor, "contribution">[] = [];
  if (job.requiredSkills.length > 0) rawFactors.push({ key: "skills", label: "Compétences", value: skillsScore, weight: weights.skills });
  if (job.requiredExperienceYears !== null) rawFactors.push({ key: "experience", label: "Expérience", value: experienceScore, weight: weights.experience });
  if (job.requiredEducationLevel !== null) rawFactors.push({ key: "education", label: "Formation", value: educationScore, weight: weights.education });
  if (job.requiredLanguages.length > 0) rawFactors.push({ key: "languages", label: "Langues", value: languagesScore, weight: weights.languages });
  if (job.remoteType !== null || job.countryName !== null) rawFactors.push({ key: "location", label: "Localisation / disponibilité", value: locationScore, weight: weights.location });
  if (job.sector && context.preferredSectors.length > 0) rawFactors.push({ key: "preferences", label: "Préférences personnelles", value: preferencesScore, weight: weights.preferences });
  const factors: ScoreFactor[] = rawFactors.map((f) => ({ ...f, contribution: (f.value * f.weight) / 100 }));
  const totalWeight = rawFactors.reduce((s, f) => s + f.weight, 0) || 1;
  const total = clamp((factors.reduce((s, f) => s + f.contribution, 0) / totalWeight) * 100, 0, 100);
  const roundedTotal = Math.round(total);

  const recommendation = rawFactors.length === 0
    ? "L'annonce ne contient pas assez d'exigences explicites pour estimer la compatibilité. Vérifie le texte avant de décider."
    : buildRecommendation(roundedTotal);

  return { total: roundedTotal, factors, strengths, watchouts, missingSkills, recommendation };
}

function buildRecommendation(score: number): string {
  if (score >= 70) return "Cette offre semble très pertinente pour ton profil. Je te recommande de candidater.";
  if (score >= 55) return "Ce poste correspond plutôt bien à ton profil — ça vaut le coup de candidater.";
  if (score >= 40) return "Ce poste correspond partiellement à ton profil — à toi de juger si ça vaut le coup selon tes priorités.";
  return "Cette offre correspond moins bien à ton profil actuel. Candidate si elle t'intéresse fortement, mais ne t'attends pas à un match parfait.";
}

export type EligibilityStatus = "LIKELY_ELIGIBLE" | "POSSIBLY_NOT_ELIGIBLE" | "UNCLEAR";

export type EligibilityResult = {
  status: EligibilityStatus;
  notes: string[];
};

/**
 * Scans the job's raw text for a graduation-year window ("class of 2027",
 * "graduating between 2027 and 2028"...). Returns null when no such
 * constraint is mentioned.
 */
function findGraduationYearRange(text: string): { min: number; max: number; quote: string } | null {
  const between = text.match(/graduat\w*[^.\n]{0,25}(?:between|entre)[^.\n]{0,10}(\d{4})[^.\n]{0,10}(?:and|et)[^.\n]{0,10}(\d{4})/i);
  if (between) {
    const [full, a, b] = between;
    const min = Math.min(Number(a), Number(b));
    const max = Math.max(Number(a), Number(b));
    return { min, max, quote: full.trim() };
  }
  const classOf = text.match(/(?:class of|promotion)\s*(\d{4})/i);
  if (classOf) {
    const year = Number(classOf[1]);
    return { min: year, max: year, quote: classOf[0].trim() };
  }
  return null;
}

export function computeEligibility(profile: ProfileForMatching, job: JobForMatching): EligibilityResult {
  const notes: string[] = [];
  let hasConcern = false;
  let hasUncertainty = false;

  // Availability is a hard personal constraint, separate from the match
  // score. A mandatory job window must be fully contained in the candidate's
  // availability window; partial overlap is not enough.
  const jobStart = job.requiredStartDate ?? null;
  const jobEnd = job.requiredEndDate ?? null;
  const availableStart = profile.availabilityStart ?? null;
  const availableEnd = profile.availabilityEnd ?? null;
  if (jobStart || jobEnd) {
    if (!availableStart || !availableEnd) {
      notes.push("L'offre impose des dates, mais ta fenêtre de disponibilité n'est pas entièrement renseignée.");
      hasUncertainty = true;
    } else if (
      (jobStart && jobStart < availableStart) ||
      (jobStart && jobStart > availableEnd) ||
      (jobEnd && jobEnd > availableEnd) ||
      (jobEnd && jobEnd < availableStart)
    ) {
      const jobWindow = `${jobStart?.toISOString().slice(0, 10) ?? "?"} → ${jobEnd?.toISOString().slice(0, 10) ?? "?"}`;
      const profileWindow = `${availableStart.toISOString().slice(0, 10)} → ${availableEnd.toISOString().slice(0, 10)}`;
      notes.push(`Condition bloquante : calendrier imposé ${jobWindow}, hors de ta disponibilité ${profileWindow}.`);
      hasConcern = true;
    }
  }

  const dateDurationWeeks = jobStart && jobEnd
    ? Math.ceil((jobEnd.getTime() - jobStart.getTime() + 86_400_000) / (7 * 86_400_000))
    : null;
  const requiredDurationWeeks = job.durationWeeks ?? dateDurationWeeks;
  const minWeeks = profile.minDurationWeeks ?? null;
  const maxWeeks = profile.maxDurationWeeks ?? null;
  if (minWeeks || maxWeeks) {
    if (requiredDurationWeeks === null) {
      notes.push("Durée de l'offre non précisée : impossible de vérifier ta contrainte de durée.");
      hasUncertainty = true;
    } else if (minWeeks && requiredDurationWeeks < minWeeks) {
      notes.push(`Condition bloquante : environ ${requiredDurationWeeks} semaine(s), sous ton minimum de ${minWeeks}.`);
      hasConcern = true;
    } else if (maxWeeks && requiredDurationWeeks > maxWeeks) {
      notes.push(`Condition bloquante : environ ${requiredDurationWeeks} semaine(s), au-dessus de ton maximum de ${maxWeeks}.`);
      hasConcern = true;
    }
  }

  // Education level
  const requiredEduRank = educationRank(job.requiredEducationLevel);
  const profileEduRank = educationRank(profile.educationLevel);
  if (requiredEduRank !== -1) {
    if (profileEduRank === -1) {
      notes.push("Niveau d'étude demandé non renseigné dans ton profil — impossible de vérifier.");
      hasUncertainty = true;
    } else if (profileEduRank < requiredEduRank) {
      const label = EDUCATION_LEVELS[requiredEduRank]?.label ?? job.requiredEducationLevel;
      notes.push(`Attention : l'offre demande un niveau "${label}", supérieur à ton niveau actuel.`);
      hasConcern = true;
    }
  }

  // Graduation year window
  const gradWindow = findGraduationYearRange(job.rawText);
  if (gradWindow) {
    if (profile.graduationYear === null) {
      notes.push(`Attention : l'offre mentionne "${gradWindow.quote}" — renseigne ton année de diplôme pour vérifier.`);
      hasUncertainty = true;
    } else if (profile.graduationYear < gradWindow.min || profile.graduationYear > gradWindow.max) {
      notes.push(`Attention : l'offre demande une année de diplôme entre ${gradWindow.min} et ${gradWindow.max}, ce qui ne correspond pas à ton profil.`);
      hasConcern = true;
    }
  }

  // Required languages entirely absent from profile
  for (const lang of job.requiredLanguages) {
    const known = profile.languages.some((pl) => norm(pl.language) === norm(lang));
    if (!known) {
      notes.push(`Langue requise (${lang}) non renseignée dans ton profil.`);
      hasUncertainty = true;
    }
  }

  // Work authorization / visa, mentioned only when the posting raises it
  const textLower = job.rawText.toLowerCase();
  const noSponsorship = /no (visa )?sponsorship|sponsorship is not available|must be authorized to work/i.test(textLower);
  if (noSponsorship) {
    if (!profile.workAuthorization || !job.countryName || !norm(profile.workAuthorization).includes(norm(job.countryName))) {
      notes.push("Attention : l'offre indique ne pas sponsoriser de visa — vérifie ton droit de travailler dans ce pays (information non confirmée).");
      hasUncertainty = true;
    }
  }

  const status: EligibilityStatus = hasConcern ? "POSSIBLY_NOT_ELIGIBLE" : hasUncertainty ? "UNCLEAR" : "LIKELY_ELIGIBLE";
  return { status, notes };
}

export { matchLabel };
