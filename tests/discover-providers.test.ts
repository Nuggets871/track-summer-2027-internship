// Verifies each API-key provider's request shape and response mapping
// against a realistic sample of that API's own documented response —
// without ever hitting the real network or requiring a real key.
import { afterEach, describe, expect, it, vi } from "vitest";
import { adzunaProvider } from "@/lib/discover/providers/adzuna";
import { jsearchProvider } from "@/lib/discover/providers/jsearch";
import { reedProvider } from "@/lib/discover/providers/reed";
import { joobleProvider } from "@/lib/discover/providers/jooble";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adzunaProvider", () => {
  const sample = {
    count: 1,
    results: [
      {
        id: "123",
        title: "Finance Summer Intern",
        description: "Join our finance team...",
        redirect_url: "https://www.adzuna.co.uk/jobs/123",
        created: "2026-06-01T00:00:00Z",
        company: { display_name: "Acme Corp" },
        location: { display_name: "London, UK" },
        category: { label: "Finance" },
        contract_type: "internship",
      },
    ],
  };

  it("maps a real-shaped response into RawSourceJob[]", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sample));
    vi.stubGlobal("fetch", fetchMock);

    const jobs = await adzunaProvider.searchJobs({ appId: "id", appKey: "key", country: "gb", what: "internship" });
    expect(jobs).toEqual([
      {
        sourceJobId: "123",
        sourceUrl: "https://www.adzuna.co.uk/jobs/123",
        title: "Finance Summer Intern",
        companyName: "Acme Corp",
        description: "Join our finance team...",
        departmentOrTeam: "Finance",
        locationText: "London, UK",
        remoteType: null,
        postedAt: new Date("2026-06-01T00:00:00Z"),
        contractType: "internship",
      },
    ]);

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toContain("/jobs/gb/search/1");
    expect(calledUrl.searchParams.get("app_id")).toBe("id");
    expect(calledUrl.searchParams.get("app_key")).toBe("key");
  });

  it("throws a clear error when app_id/app_key are missing", async () => {
    await expect(adzunaProvider.searchJobs({ country: "gb" })).rejects.toThrow(/app_id/);
  });

  it("healthCheck reports failure without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false, 401)));
    const result = await adzunaProvider.healthCheck({ appId: "id", appKey: "bad", country: "gb" });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/401/);
  });
});

describe("jsearchProvider", () => {
  const sample = {
    data: [
      {
        job_id: "abc",
        job_title: "Software Engineer Intern",
        employer_name: "Acme",
        job_description: "Build things.",
        job_city: "London",
        job_country: "UK",
        job_apply_link: "https://jsearch.example/apply/abc",
        job_posted_at_datetime_utc: "2026-06-01T00:00:00Z",
        job_employment_type: "INTERN",
        job_is_remote: false,
      },
    ],
  };

  it("maps a real-shaped response into RawSourceJob[]", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(sample)));
    const jobs = await jsearchProvider.searchJobs({ apiKey: "key", query: "software intern" });
    expect(jobs).toEqual([
      {
        sourceJobId: "abc",
        sourceUrl: "https://jsearch.example/apply/abc",
        title: "Software Engineer Intern",
        companyName: "Acme",
        description: "Build things.",
        departmentOrTeam: null,
        locationText: "London, UK",
        remoteType: null,
        postedAt: new Date("2026-06-01T00:00:00Z"),
        contractType: "INTERN",
      },
    ]);
  });

  it("throws when the API key is missing", async () => {
    await expect(jsearchProvider.searchJobs({})).rejects.toThrow(/RapidAPI/);
  });

  it("doesn't crash and stores a null postedAt when the date is unparsable", async () => {
    // Regression: live with a real JSearch source, an unparsable
    // job_posted_at_datetime_utc used to become `new Date(garbage)` — an
    // Invalid Date — which Prisma then rejected outright when the sync
    // tried to write the listing, surfacing to the user as a Server
    // Components render error (Next.js's minified error #441).
    const malformed = { data: [{ ...sample.data[0], job_posted_at_datetime_utc: "not-a-real-date" }] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(malformed)));
    const jobs = await jsearchProvider.searchJobs({ apiKey: "key", query: "software intern" });
    expect(jobs[0].postedAt).toBeNull();
  });
});

describe("reedProvider", () => {
  const sample = {
    totalResults: 1,
    results: [
      {
        jobId: 111,
        employerName: "Acme",
        jobTitle: "Marketing Intern",
        jobDescription: "Support the marketing team.",
        locationName: "London",
        date: "2026-06-01",
        jobUrl: "https://www.reed.co.uk/jobs/111",
        contractType: "Internship",
      },
    ],
  };

  it("maps a real-shaped response into RawSourceJob[]", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(sample)));
    const jobs = await reedProvider.searchJobs({ apiKey: "key", keywords: "marketing internship" });
    expect(jobs).toEqual([
      {
        sourceJobId: "111",
        sourceUrl: "https://www.reed.co.uk/jobs/111",
        title: "Marketing Intern",
        companyName: "Acme",
        description: "Support the marketing team.",
        departmentOrTeam: null,
        locationText: "London",
        remoteType: null,
        postedAt: new Date("2026-06-01"),
        contractType: "Internship",
      },
    ]);
  });

  it("sends HTTP Basic auth built from the API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sample));
    vi.stubGlobal("fetch", fetchMock);
    await reedProvider.searchJobs({ apiKey: "mykey", keywords: "intern" });
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${Buffer.from("mykey:").toString("base64")}`);
  });
});

describe("joobleProvider", () => {
  const sample = {
    totalCount: 1,
    jobs: [
      {
        title: "Data Intern",
        location: "Paris, France",
        snippet: "Analyze data...",
        link: "https://jooble.org/jobs/999",
        company: "Acme",
        updated: "2026-06-01",
        type: "Internship",
      },
    ],
  };

  it("maps a real-shaped response into RawSourceJob[], using the link as the id", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(sample)));
    const jobs = await joobleProvider.searchJobs({ apiKey: "key", keywords: "data internship" });
    expect(jobs).toEqual([
      {
        sourceJobId: "https://jooble.org/jobs/999",
        sourceUrl: "https://jooble.org/jobs/999",
        title: "Data Intern",
        companyName: "Acme",
        description: "Analyze data...",
        departmentOrTeam: null,
        locationText: "Paris, France",
        remoteType: null,
        postedAt: new Date("2026-06-01"),
        contractType: "Internship",
      },
    ]);
  });

  it("POSTs keywords/location as a JSON body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(sample));
    vi.stubGlobal("fetch", fetchMock);
    await joobleProvider.searchJobs({ apiKey: "mykey", keywords: "data internship", location: "Paris" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://jooble.org/api/mykey");
    expect(JSON.parse(init.body)).toEqual({ keywords: "data internship", location: "Paris" });
  });
});
