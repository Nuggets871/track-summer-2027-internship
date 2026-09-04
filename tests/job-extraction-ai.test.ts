// Covers the AI-extraction sanitize step in isolation, mocking aiChat so we
// never touch prisma/the network. Focused on the date-precision behavior:
// a real posting often only states a month ("starting September 2026")
// rather than an exact day, and that used to be discarded entirely.
import { describe, expect, it, vi } from "vitest";
import { extractJobPostingWithAI } from "@/lib/ai/prompts/job-extraction";
import { aiChat } from "@/lib/ai/provider";

vi.mock("@/lib/ai/provider", () => ({ aiChat: vi.fn() }));

describe("extractJobPostingWithAI — date precision", () => {
  it("keeps a month/year-only date by defaulting to the 1st, instead of discarding it", async () => {
    vi.mocked(aiChat).mockResolvedValue(JSON.stringify({ title: "Intern", startDate: "2026-09", deadline: "2026-10-15", evidence: { requiredSchedule: "starting September 2026" } }));
    const result = await extractJobPostingWithAI("some raw text, starting September 2026");
    expect(result?.startDate).toBe("2026-09-01");
    expect(result?.deadline).toBe("2026-10-15");
  });

  it("discards a bare year with no month as too imprecise", async () => {
    vi.mocked(aiChat).mockResolvedValue(JSON.stringify({ startDate: "2026" }));
    const result = await extractJobPostingWithAI("some raw text");
    expect(result?.startDate).toBeNull();
  });

  it("still returns null (not the string 'null' or garbage) for an unparsable date", async () => {
    vi.mocked(aiChat).mockResolvedValue(JSON.stringify({ deadline: "sometime soon" }));
    const result = await extractJobPostingWithAI("some raw text");
    expect(result?.deadline).toBeNull();
  });
});

describe("extractJobPostingWithAI — grounded requirements", () => {
  it("rejects company longevity even when the model puts it in requiredExperienceYears", async () => {
    const source = "Our company has 22 years of experience building software.";
    vi.mocked(aiChat).mockResolvedValue(JSON.stringify({
      requiredExperienceYears: 22,
      evidence: { requiredExperienceYears: source, requiredSkills: {} },
    }));
    const result = await extractJobPostingWithAI(source);
    expect(result?.requiredExperienceYears).toBeNull();
  });

  it("keeps candidate requirements and canonicalizes grounded skill aliases", async () => {
    const source = "You must have at least 2 years of experience and strong NodeJS skills.";
    vi.mocked(aiChat).mockResolvedValue(JSON.stringify({
      requiredExperienceYears: 2,
      requiredSkills: ["NodeJS"],
      evidence: { requiredExperienceYears: source, requiredSkills: { NodeJS: "strong NodeJS skills" } },
    }));
    const result = await extractJobPostingWithAI(source);
    expect(result?.requiredExperienceYears).toBe(2);
    expect(result?.requiredSkills).toEqual(["Node.js"]);
  });

  it("rejects a PhD requirement inferred from an inclusive education range", async () => {
    const source = "Whether you're an undergrad or a PhD student, your contributions matter.";
    vi.mocked(aiChat).mockResolvedValue(JSON.stringify({
      requiredEducationLevel: "PHD",
      evidence: { requiredEducationLevel: source, requiredExperienceYears: null, requiredSkills: {} },
    }));
    const result = await extractJobPostingWithAI(source);
    expect(result?.requiredEducationLevel).toBeNull();
  });

  it("keeps an explicit PhD requirement", async () => {
    const source = "Qualifications: PhD required in computer science.";
    vi.mocked(aiChat).mockResolvedValue(JSON.stringify({
      requiredEducationLevel: "PHD",
      evidence: { requiredEducationLevel: source, requiredExperienceYears: null, requiredSkills: {} },
    }));
    const result = await extractJobPostingWithAI(source);
    expect(result?.requiredEducationLevel).toBe("PHD");
  });
});
