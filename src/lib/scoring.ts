import { DEFAULT_PRIORITY_WEIGHTS } from "@/lib/constants";
import { clamp, daysUntil } from "@/lib/utils";

export type ScoreFactor = {
  key: string;
  label: string;
  /** Raw factor value, already normalized to 0-100 (can exceed for urgency spikes, clamped before use). */
  value: number;
  /** Weight applied to this factor, in the same units as the other weights (not necessarily summing to 100). */
  weight: number;
  /** weight * value / 100, i.e. this factor's actual contribution to the total score. */
  contribution: number;
};

export type ScoreResult = {
  total: number; // 0-100
  factors: ScoreFactor[];
};

export type PriorityWeights = typeof DEFAULT_PRIORITY_WEIGHTS;

export type PriorityScoreInput = {
  interestScore: number; // 0-100
  deadline: Date | string | null;
  fitScore: number; // 0-100, from the company
  estimatedProbability: number; // 0-100
  relationshipStrength: number | null; // 1-5, from the primary contact
  lastInteractionAt: Date | string | null;
  discoveredAt: Date | string | null;
  isTerminal: boolean; // OFFER / REJECTED / GHOSTED / ABANDONED — priority becomes moot
  staleThresholdDays: number;
};

/**
 * "Priority Score" from the brief:
 *   Priority Score = intérêt + proximité deadline + fit + probabilité + relation existante - ancienneté excessive
 *
 * Every factor is normalized to 0-100 first, then combined with the user's
 * configurable weights (Settings > Scoring). The breakdown is always
 * returned so the UI can show exactly how the number was produced.
 */
export function computePriorityScore(
  input: PriorityScoreInput,
  weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS,
): ScoreResult {
  if (input.isTerminal) {
    return { total: 0, factors: [] };
  }

  const dUntil = daysUntil(input.deadline);
  // No deadline set -> neutral urgency. Overdue or <=0 days -> max urgency.
  // 30+ days away -> urgency fades to ~0.
  const deadlineProximity =
    dUntil === null ? 40 : clamp(100 - (dUntil / 30) * 100, 0, 100);

  const relationship = input.relationshipStrength ? input.relationshipStrength * 20 : 10;

  const referenceDate = input.lastInteractionAt ?? input.discoveredAt;
  const daysSince = referenceDate ? -1 * (daysUntil(referenceDate) ?? 0) : 0;
  const staleness = clamp(((daysSince - input.staleThresholdDays) / 30) * 100, 0, 100);

  const rawFactors: Omit<ScoreFactor, "contribution">[] = [
    { key: "interest", label: "Intérêt personnel", value: clamp(input.interestScore, 0, 100), weight: weights.interest },
    { key: "deadlineProximity", label: "Proximité de la deadline", value: deadlineProximity, weight: weights.deadlineProximity },
    { key: "fit", label: "Fit avec l'entreprise", value: clamp(input.fitScore, 0, 100), weight: weights.fit },
    { key: "probability", label: "Probabilité estimée", value: clamp(input.estimatedProbability, 0, 100), weight: weights.probability },
    { key: "relationship", label: "Relation existante", value: clamp(relationship, 0, 100), weight: weights.relationship },
    { key: "staleness", label: "Ancienneté excessive", value: staleness, weight: weights.staleness },
  ];

  const factors: ScoreFactor[] = rawFactors.map((f) => ({ ...f, contribution: (f.value * f.weight) / 100 }));
  const positiveWeightSum = rawFactors.filter((f) => f.weight > 0).reduce((s, f) => s + f.weight, 0) || 1;
  const total = clamp((factors.reduce((s, f) => s + f.contribution, 0) / positiveWeightSum) * 100, 0, 100);

  return { total: Math.round(total), factors };
}

export type CompanyFitInput = {
  interestLevel: number; // 1-5
  countryPreference: number | null; // 1-5
  sectorMatchesPreferences: boolean | null; // null = unknown / no preference set
  avgApplicationProbability: number | null; // 0-100
  sponsorshipFriendliness: number | null; // 0-100 (share of applications where sponsorship is possible)
};

/**
 * Company "Fit Score" (0-100): how well a target company matches the
 * user's search criteria. Shown on the Company page as "Fit Score: 82/100".
 */
export function computeCompanyFitScore(input: CompanyFitInput): ScoreResult {
  const rawFactors: Omit<ScoreFactor, "contribution">[] = [
    { key: "interest", label: "Intérêt personnel", value: clamp(input.interestLevel * 20, 0, 100), weight: 30 },
    { key: "location", label: "Localisation / pays préféré", value: clamp((input.countryPreference ?? 3) * 20, 0, 100), weight: 20 },
    { key: "sector", label: "Adéquation secteur", value: input.sectorMatchesPreferences === null ? 50 : input.sectorMatchesPreferences ? 100 : 25, weight: 15 },
    { key: "probability", label: "Probabilité / qualité des postes", value: input.avgApplicationProbability ?? 50, weight: 20 },
    { key: "sponsorship", label: "Probabilité de visa / sponsorship", value: input.sponsorshipFriendliness ?? 50, weight: 15 },
  ];
  const factors = rawFactors.map((f) => ({ ...f, contribution: (f.value * f.weight) / 100 }));
  const total = clamp(factors.reduce((s, f) => s + f.contribution, 0), 0, 100);
  return { total: Math.round(total), factors };
}

export type OfferWeights = {
  salary: number;
  prestige: number;
  interest: number;
  learning: number;
  network: number;
  careerPotential: number;
  costOfLiving: number; // negative contribution when high
  visaSupport: number;
  housing: number;
};

export const DEFAULT_OFFER_WEIGHTS: OfferWeights = {
  salary: 20,
  prestige: 15,
  interest: 20,
  learning: 15,
  network: 10,
  careerPotential: 10,
  costOfLiving: 5,
  visaSupport: 3,
  housing: 2,
};

export type OfferForScoring = {
  id: string;
  salaryAmount: number | null;
  currency: string;
  prestige: number;
  interest: number;
  learning: number;
  network: number;
  careerPotential: number;
  costOfLivingIndex: number;
  visaSupport: boolean;
  housing: boolean;
};

/**
 * Compares a set of offers on a common 0-100 scale. Salary is normalized
 * relative to the max salary in the compared set (currency conversion is
 * not performed — offers should be compared in a common currency, or the
 * user should treat cross-currency comparisons as approximate).
 */
export function computeOfferScores(
  offers: OfferForScoring[],
  weights: OfferWeights = DEFAULT_OFFER_WEIGHTS,
): Record<string, ScoreResult> {
  const maxSalary = Math.max(1, ...offers.map((o) => o.salaryAmount ?? 0));
  const result: Record<string, ScoreResult> = {};

  for (const offer of offers) {
    const rawFactors: Omit<ScoreFactor, "contribution">[] = [
      { key: "salary", label: "Salaire", value: clamp(((offer.salaryAmount ?? 0) / maxSalary) * 100, 0, 100), weight: weights.salary },
      { key: "prestige", label: "Prestige", value: offer.prestige * 20, weight: weights.prestige },
      { key: "interest", label: "Intérêt", value: offer.interest * 20, weight: weights.interest },
      { key: "learning", label: "Apprentissage", value: offer.learning * 20, weight: weights.learning },
      { key: "network", label: "Réseau", value: offer.network * 20, weight: weights.network },
      { key: "careerPotential", label: "Potentiel carrière", value: offer.careerPotential * 20, weight: weights.careerPotential },
      { key: "costOfLiving", label: "Coût de la vie (inversé)", value: 100 - offer.costOfLivingIndex, weight: weights.costOfLiving },
      { key: "visaSupport", label: "Support visa", value: offer.visaSupport ? 100 : 0, weight: weights.visaSupport },
      { key: "housing", label: "Logement fourni", value: offer.housing ? 100 : 0, weight: weights.housing },
    ];
    const factors = rawFactors.map((f) => ({ ...f, contribution: (f.value * f.weight) / 100 }));
    const totalWeight = rawFactors.reduce((s, f) => s + f.weight, 0) || 1;
    const total = clamp((factors.reduce((s, f) => s + f.contribution, 0) / totalWeight) * 100, 0, 100);
    result[offer.id] = { total: Math.round(total), factors };
  }

  return result;
}

export function isStagnant(lastInteractionAt: Date | string | null, discoveredAt: Date | string | null, thresholdDays: number) {
  const reference = lastInteractionAt ?? discoveredAt;
  if (!reference) return false;
  const days = -1 * (daysUntil(reference) ?? 0);
  return days > thresholdDays;
}
