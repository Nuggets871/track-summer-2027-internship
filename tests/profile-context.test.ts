import { describe, expect, it } from "vitest";
import { buildProfileContext } from "@/lib/ai/profile-context";
import type { AppProfile } from "@/lib/data/profile";

describe("AI profile context harness", () => {
  it("passes detailed identity, experience, education and projects to prompts", () => {
    const profile = {
      firstName: "Test",
      lastName: "Candidate",
      email: "candidate@example.com",
      phone: "+33 1 00 00 00 00",
      location: "Lyon, France",
      headline: "Computer engineering student and full-stack developer",
      summary: "Builds maintainable web applications.",
      linkedinUrl: "https://linkedin.com/in/candidate",
      githubUrl: "https://github.com/candidate",
      portfolioUrl: "https://candidate.example.com",
      educationLevel: "MASTER",
      fieldOfStudy: "Computer Science",
      graduationYear: 2028,
      yearsOfExperience: 2,
      experiences: [{ title: "Developer", company: "Example", startDate: "2024-08", endDate: null, description: "Built and maintained a SaaS product." }],
      educationHistory: [{ institution: "Engineering School", degree: "Engineering degree", startDate: "2025-09", endDate: "2028-08", description: "Computer science and networks." }],
      projects: [{ name: "Grade dashboard", description: "Automates report collection and grade simulation.", technologies: ["Angular", "Node.js", "PostgreSQL"], url: "https://notes.example.com", repositoryUrl: null }],
      skills: ["Angular", "Node.js", "PostgreSQL"],
      languages: [{ language: "English", level: "ADVANCED", detail: "C1 — TOEIC 950/990" }],
      workAuthorization: null,
      availabilityNote: "9 to 10 weeks in Summer 2027",
      cvDocumentId: null,
      cvRawText: "CV source text",
      cvParsedAt: null,
      updatedAt: new Date(),
    } satisfies AppProfile;

    const context = buildProfileContext(profile, { includeContact: true, includeCv: true });
    for (const expected of ["candidate@example.com", "Computer engineering student", "Built and maintained", "Engineering degree", "Grade dashboard", "TOEIC 950/990", "CV source text"]) {
      expect(context).toContain(expected);
    }
  });
});
