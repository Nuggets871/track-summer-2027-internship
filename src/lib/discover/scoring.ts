// Step 1 of the two-step matching strategy: a cheap, deterministic pre-score
// for every listing, computed with the exact same engine already used for
// Opportunities (computeJobMatch/computeEligibility — never an AI call).
// Because it's pure arithmetic over data already in memory, recomputing it
// for every active listing whenever the profile changes stays fast even at
// thousands of rows — no background job queue needed.

import { prisma } from "@/lib/prisma";
import { getProfile } from "@/lib/data/profile";
import { getSettings } from "@/lib/data/settings";
import { computeJobMatch, computeEligibility, type JobForMatching } from "@/lib/job-matching";
import { safeJsonParse } from "@/lib/utils";

function toJobForMatching(listing: {
  requiredSkills: string | null;
  requiredLanguages: string | null;
  requiredEducationLevel: string | null;
  requiredExperienceYears: number | null;
  countryName: string | null;
  remoteType: string | null;
  sector: string | null;
  rawText: string | null;
  title: string;
}): JobForMatching {
  return {
    requiredSkills: safeJsonParse<string[]>(listing.requiredSkills, []),
    requiredLanguages: safeJsonParse<string[]>(listing.requiredLanguages, []),
    requiredEducationLevel: listing.requiredEducationLevel,
    requiredExperienceYears: listing.requiredExperienceYears,
    countryName: listing.countryName,
    remoteType: (listing.remoteType as JobForMatching["remoteType"]) ?? null,
    sector: listing.sector,
    rawText: listing.rawText ?? listing.title,
  };
}

/** Computes and returns the score fields for one listing — used at ingest
 * time, before the row is persisted. */
export async function scoreListingFields(listing: Parameters<typeof toJobForMatching>[0]) {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const jobForMatching = toJobForMatching(listing);
  const match = computeJobMatch(profile, jobForMatching, settings.matchWeights, {
    preferredCountries: settings.preferredCountries,
    preferredSectors: settings.preferredSectors,
  });
  const eligibility = computeEligibility(profile, jobForMatching);

  return {
    matchScore: match.total,
    matchBreakdown: JSON.stringify(match.factors),
    strengths: JSON.stringify(match.strengths),
    watchouts: JSON.stringify(match.watchouts),
    missingSkills: JSON.stringify(match.missingSkills),
    recommendation: match.recommendation,
    eligibilityStatus: eligibility.status,
    eligibilityNotes: JSON.stringify(eligibility.notes),
    scoreProfileUpdatedAtSnapshot: profile.updatedAt,
  };
}

/**
 * Recomputes the local pre-score for every active, non-duplicate listing —
 * called after the profile changes (see updateProfile/applyCvToProfile) so
 * "best match" sort and "Match > 80%" filters stay accurate without ever
 * calling the AI. Batches updates in a single transaction per chunk to stay
 * fast even at several thousand rows.
 */
export async function recomputeAllLocalScores(): Promise<number> {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  const listings = await prisma.jobListing.findMany({
    where: { status: "ACTIVE", duplicateOfId: null },
    select: {
      id: true,
      title: true,
      requiredSkills: true,
      requiredLanguages: true,
      requiredEducationLevel: true,
      requiredExperienceYears: true,
      countryName: true,
      remoteType: true,
      sector: true,
      rawText: true,
    },
  });

  const CHUNK_SIZE = 200;
  let updated = 0;
  for (let i = 0; i < listings.length; i += CHUNK_SIZE) {
    const chunk = listings.slice(i, i + CHUNK_SIZE);
    await prisma.$transaction(
      chunk.map((listing) => {
        const jobForMatching = toJobForMatching(listing);
        const match = computeJobMatch(profile, jobForMatching, settings.matchWeights, {
          preferredCountries: settings.preferredCountries,
          preferredSectors: settings.preferredSectors,
        });
        const eligibility = computeEligibility(profile, jobForMatching);
        return prisma.jobListing.update({
          where: { id: listing.id },
          data: {
            matchScore: match.total,
            matchBreakdown: JSON.stringify(match.factors),
            strengths: JSON.stringify(match.strengths),
            watchouts: JSON.stringify(match.watchouts),
            missingSkills: JSON.stringify(match.missingSkills),
            recommendation: match.recommendation,
            eligibilityStatus: eligibility.status,
            eligibilityNotes: JSON.stringify(eligibility.notes),
            scoreProfileUpdatedAtSnapshot: profile.updatedAt,
          },
        });
      }),
    );
    updated += chunk.length;
  }

  return updated;
}
