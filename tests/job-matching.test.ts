import { describe, expect, it } from "vitest";
import { computeJobMatch, computeEligibility, type ProfileForMatching, type JobForMatching } from "@/lib/job-matching";
import { DEFAULT_MATCH_WEIGHTS } from "@/lib/constants";

const context = { preferredCountries: ["Royaume-Uni", "Suisse"], preferredSectors: ["Finance"] };

function makeProfile(overrides: Partial<ProfileForMatching> = {}): ProfileForMatching {
  return {
    educationLevel: "MASTER",
    graduationYear: 2027,
    yearsOfExperience: 1,
    skills: ["Excel", "Python", "Financial Modeling"],
    languages: [
      { language: "Français", level: "NATIVE" },
      { language: "Anglais", level: "FLUENT" },
    ],
    workAuthorization: "Citoyen UE",
    availabilityNote: "Disponible été 2027",
    ...overrides,
  };
}

function makeJob(overrides: Partial<JobForMatching> = {}): JobForMatching {
  return {
    requiredSkills: ["Excel", "Python", "SQL"],
    requiredLanguages: ["Anglais"],
    requiredEducationLevel: "MASTER",
    requiredExperienceYears: 1,
    countryName: "Royaume-Uni",
    remoteType: null,
    sector: "Finance",
    rawText: "",
    ...overrides,
  };
}

describe("computeJobMatch", () => {
  it("produces a total score between 0 and 100 with a per-dimension breakdown", () => {
    const result = computeJobMatch(makeProfile(), makeJob(), DEFAULT_MATCH_WEIGHTS, context);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.factors).toHaveLength(6);
    expect(result.factors.map((f) => f.key).sort()).toEqual(
      ["education", "experience", "languages", "location", "preferences", "skills"].sort(),
    );
  });

  it("scores a strong skills match higher than a weak one, all else equal", () => {
    const strong = computeJobMatch(makeProfile(), makeJob({ requiredSkills: ["Excel", "Python"] }), DEFAULT_MATCH_WEIGHTS, context);
    const weak = computeJobMatch(makeProfile(), makeJob({ requiredSkills: ["Bloomberg", "VBA", "SAP"] }), DEFAULT_MATCH_WEIGHTS, context);
    expect(strong.total).toBeGreaterThan(weak.total);
  });

  it("matches safe aliases without confusing unrelated languages", () => {
    const result = computeJobMatch(
      makeProfile({ skills: ["Node.js", "PostgreSQL", "Java"] }),
      makeJob({ requiredSkills: ["NodeJS", "Postgres", "JavaScript"] }),
      DEFAULT_MATCH_WEIGHTS,
      { preferredCountries: [], preferredSectors: [] },
    );
    expect(result.missingSkills).toEqual(["JavaScript"]);
    expect(result.strengths.join(" ")).toContain("NodeJS");
    expect(result.strengths.join(" ")).toContain("Postgres");
  });

  it("lists missing skills and does not list skills the candidate already has", () => {
    const result = computeJobMatch(makeProfile(), makeJob({ requiredSkills: ["Excel", "SQL", "Bloomberg"] }), DEFAULT_MATCH_WEIGHTS, context);
    expect(result.missingSkills).toEqual(expect.arrayContaining(["SQL", "Bloomberg"]));
    expect(result.missingSkills).not.toContain("Excel");
  });

  it("gives full marks on experience when the candidate meets or exceeds the requirement", () => {
    const result = computeJobMatch(makeProfile({ yearsOfExperience: 3 }), makeJob({ requiredExperienceYears: 1 }), DEFAULT_MATCH_WEIGHTS, context);
    const experienceFactor = result.factors.find((f) => f.key === "experience")!;
    expect(experienceFactor.value).toBe(100);
  });

  it("penalizes education below the required level", () => {
    const result = computeJobMatch(makeProfile({ educationLevel: "BACHELOR" }), makeJob({ requiredEducationLevel: "PHD" }), DEFAULT_MATCH_WEIGHTS, context);
    const eduFactor = result.factors.find((f) => f.key === "education")!;
    expect(eduFactor.value).toBeLessThan(50);
  });

  it("treats remote jobs as fully satisfying the location dimension", () => {
    const result = computeJobMatch(makeProfile(), makeJob({ countryName: "Some Country Not Preferred", remoteType: "REMOTE" }), DEFAULT_MATCH_WEIGHTS, context);
    const locationFactor = result.factors.find((f) => f.key === "location")!;
    expect(locationFactor.value).toBe(100);
  });

  it("respects custom weights (a zero-weighted dimension contributes nothing)", () => {
    const weights = { ...DEFAULT_MATCH_WEIGHTS, skills: 0 };
    const goodSkills = computeJobMatch(makeProfile(), makeJob({ requiredSkills: ["Excel"] }), weights, context);
    const badSkills = computeJobMatch(makeProfile(), makeJob({ requiredSkills: ["Bloomberg", "SAP", "AutoCAD"] }), weights, context);
    // With skills weighted at 0, a candidate missing every required skill should
    // score identically to one who has them all.
    expect(goodSkills.total).toBe(badSkills.total);
  });
});

describe("computeEligibility", () => {
  it("returns LIKELY_ELIGIBLE when no red flags are found", () => {
    const result = computeEligibility(makeProfile(), makeJob());
    expect(result.status).toBe("LIKELY_ELIGIBLE");
    expect(result.notes).toHaveLength(0);
  });

  it("flags POSSIBLY_NOT_ELIGIBLE when the graduation year falls outside the posting's stated window", () => {
    const job = makeJob({ rawText: "We require candidates graduating between 2028 and 2029." });
    const result = computeEligibility(makeProfile({ graduationYear: 2027 }), job);
    expect(result.status).toBe("POSSIBLY_NOT_ELIGIBLE");
    expect(result.notes.some((n) => n.includes("2028") && n.includes("2029"))).toBe(true);
  });

  it("does not flag a graduation year that falls inside the stated window", () => {
    const job = makeJob({ rawText: "We require candidates graduating between 2026 and 2027." });
    const result = computeEligibility(makeProfile({ graduationYear: 2027 }), job);
    expect(result.status).toBe("LIKELY_ELIGIBLE");
  });

  it("marks UNCLEAR (not a hard rejection) when a required language isn't in the profile at all", () => {
    const job = makeJob({ requiredLanguages: ["Allemand"] });
    const result = computeEligibility(makeProfile(), job);
    expect(result.status).toBe("UNCLEAR");
    expect(result.notes.some((n) => n.includes("Allemand"))).toBe(true);
  });

  it("never claims certainty when education level can't be verified", () => {
    const result = computeEligibility(makeProfile({ educationLevel: null }), makeJob({ requiredEducationLevel: "MASTER" }));
    expect(result.status).not.toBe("LIKELY_ELIGIBLE");
  });
});
