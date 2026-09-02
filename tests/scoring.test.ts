import { describe, expect, it } from "vitest";
import { computeCompanyFitScore, computeOfferScores, computePriorityScore, isStagnant } from "@/lib/scoring";
import { DEFAULT_PRIORITY_WEIGHTS } from "@/lib/constants";

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

describe("computePriorityScore", () => {
  it("returns 0 with no factors for a terminal (closed) application", () => {
    const result = computePriorityScore({
      interestScore: 90,
      deadline: daysFromNow(1),
      fitScore: 80,
      estimatedProbability: 70,
      relationshipStrength: 5,
      lastInteractionAt: new Date(),
      discoveredAt: new Date(),
      isTerminal: true,
      staleThresholdDays: 14,
    });
    expect(result.total).toBe(0);
    expect(result.factors).toHaveLength(0);
  });

  it("gives a higher score to an application with a closer deadline, all else equal", () => {
    const base = {
      interestScore: 60,
      fitScore: 60,
      estimatedProbability: 50,
      relationshipStrength: 3,
      lastInteractionAt: new Date(),
      discoveredAt: new Date(),
      isTerminal: false,
      staleThresholdDays: 14,
    };
    const soon = computePriorityScore({ ...base, deadline: daysFromNow(2) }, DEFAULT_PRIORITY_WEIGHTS);
    const far = computePriorityScore({ ...base, deadline: daysFromNow(60) }, DEFAULT_PRIORITY_WEIGHTS);
    expect(soon.total).toBeGreaterThan(far.total);
  });

  it("penalizes staleness when the last interaction is far in the past", () => {
    const fresh = computePriorityScore(
      {
        interestScore: 60,
        deadline: null,
        fitScore: 60,
        estimatedProbability: 50,
        relationshipStrength: 3,
        lastInteractionAt: daysFromNow(-1),
        discoveredAt: daysFromNow(-1),
        isTerminal: false,
        staleThresholdDays: 14,
      },
      DEFAULT_PRIORITY_WEIGHTS,
    );
    const stale = computePriorityScore(
      {
        interestScore: 60,
        deadline: null,
        fitScore: 60,
        estimatedProbability: 50,
        relationshipStrength: 3,
        lastInteractionAt: daysFromNow(-60),
        discoveredAt: daysFromNow(-60),
        isTerminal: false,
        staleThresholdDays: 14,
      },
      DEFAULT_PRIORITY_WEIGHTS,
    );
    expect(stale.total).toBeLessThan(fresh.total);
  });

  it("always returns a score between 0 and 100", () => {
    const result = computePriorityScore(
      {
        interestScore: 100,
        deadline: daysFromNow(-30), // overdue -> max urgency
        fitScore: 100,
        estimatedProbability: 100,
        relationshipStrength: 5,
        lastInteractionAt: daysFromNow(-200), // very stale
        discoveredAt: daysFromNow(-200),
        isTerminal: false,
        staleThresholdDays: 14,
      },
      DEFAULT_PRIORITY_WEIGHTS,
    );
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });
});

describe("computeCompanyFitScore", () => {
  it("scores a highly-preferred company higher than a neutral one", () => {
    const preferred = computeCompanyFitScore({
      interestLevel: 5,
      countryPreference: 5,
      sectorMatchesPreferences: true,
      avgApplicationProbability: 80,
      sponsorshipFriendliness: 100,
    });
    const neutral = computeCompanyFitScore({
      interestLevel: 3,
      countryPreference: 3,
      sectorMatchesPreferences: null,
      avgApplicationProbability: null,
      sponsorshipFriendliness: null,
    });
    expect(preferred.total).toBeGreaterThan(neutral.total);
    expect(preferred.total).toBeLessThanOrEqual(100);
  });
});

describe("computeOfferScores", () => {
  it("ranks the offer with the higher salary and better ratings first", () => {
    const scores = computeOfferScores([
      { id: "a", salaryAmount: 2000, currency: "EUR", prestige: 2, interest: 2, learning: 2, network: 2, careerPotential: 2, costOfLivingIndex: 60, visaSupport: false, housing: false },
      { id: "b", salaryAmount: 4000, currency: "EUR", prestige: 5, interest: 5, learning: 5, network: 5, careerPotential: 5, costOfLivingIndex: 40, visaSupport: true, housing: true },
    ]);
    expect(scores.b.total).toBeGreaterThan(scores.a.total);
  });
});

describe("isStagnant", () => {
  it("is false when the last interaction is recent", () => {
    expect(isStagnant(daysFromNow(-2), daysFromNow(-10), 14)).toBe(false);
  });

  it("is true when the last interaction is older than the threshold", () => {
    expect(isStagnant(daysFromNow(-20), daysFromNow(-30), 14)).toBe(true);
  });

  it("falls back to discoveredAt when there is no interaction yet", () => {
    expect(isStagnant(null, daysFromNow(-30), 14)).toBe(true);
    expect(isStagnant(null, daysFromNow(-1), 14)).toBe(false);
  });
});
