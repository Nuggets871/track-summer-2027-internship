import { describe, expect, it } from "vitest";
import { htmlToText, extractJobPostingFromHtml, extractJobPostingFromText, normalizeLanguageName } from "@/lib/job-extraction";

describe("htmlToText", () => {
  it("strips scripts, styles and tags, decoding entities", () => {
    const html = `<html><head><style>.a{color:red}</style><script>alert(1)</script></head>
      <body><h1>Summer Analyst</h1><p>Great &amp; exciting role</p></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("Summer Analyst");
    expect(text).toContain("Great & exciting role");
    expect(text).not.toContain("alert(1)");
    expect(text).not.toContain("color:red");
  });
});

describe("extractJobPostingFromHtml — structured data (schema.org JobPosting)", () => {
  const html = `
    <html><head><title>Summer Analyst — Meridian Bank</title>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      "title": "Summer Analyst",
      "hiringOrganization": { "@type": "Organization", "name": "Meridian Bank International" },
      "jobLocation": { "@type": "Place", "address": { "@type": "PostalAddress", "addressLocality": "London", "addressCountry": "United Kingdom" } },
      "description": "<p>Support live M&amp;A transactions. Requires Excel and Python. Fluent English required.</p>",
      "employmentType": "INTERN",
      "validThrough": "2026-12-31",
      "baseSalary": { "@type": "MonetaryAmount", "currency": "GBP", "value": { "@type": "QuantitativeValue", "minValue": 3000 } }
    }
    </script>
    </head><body></body></html>`;

  it("uses the JSON-LD block as the authoritative source", () => {
    const result = extractJobPostingFromHtml(html);
    expect(result.extractionMethod).toBe("STRUCTURED_DATA");
    expect(result.title).toBe("Summer Analyst");
    expect(result.companyName).toBe("Meridian Bank International");
    expect(result.city).toBe("London");
    expect(result.salaryAmount).toBe(3000);
    expect(result.salaryCurrency).toBe("GBP");
    expect(result.deadline).toBe("2026-12-31");
  });

  it("still runs heuristics over the description to fill in skills/languages", () => {
    const result = extractJobPostingFromHtml(html);
    expect(result.requiredSkills).toEqual(expect.arrayContaining(["Excel", "Python"]));
    expect(result.requiredLanguages).toContain("Anglais");
  });
});

describe("extractJobPostingFromHtml — heuristic fallback (no structured data)", () => {
  const html = `<html><head><title>Data Analyst Intern - Acme Corp</title></head>
    <body>
      <h1>Data Analyst Intern</h1>
      <p>This is a fully remote internship. Duration: 6 months.</p>
      <p>Qualifications: Bachelor degree required, SQL and Python experience, 1+ years of experience preferred.</p>
      <p>Salary: €2,500 per month.</p>
      <p>Apply by 2026-11-01.</p>
    </body></html>`;

  it("falls back to HEURISTIC extraction", () => {
    const result = extractJobPostingFromHtml(html);
    expect(result.extractionMethod).toBe("HEURISTIC");
  });

  it("detects remote type, skills, salary, duration and deadline from plain text", () => {
    const result = extractJobPostingFromHtml(html);
    expect(result.remoteType).toBe("REMOTE");
    expect(result.requiredSkills).toEqual(expect.arrayContaining(["SQL", "Python"]));
    expect(result.salaryAmount).toBe(2500);
    expect(result.salaryCurrency).toBe("EUR");
    expect(result.durationMonths).toBe(6);
    expect(result.requiredEducationLevel).toBe("BACHELOR");
    expect(result.requiredExperienceYears).toBe(1);
    expect(result.deadline).toBe("2026-11-01");
  });

  it("never invents a company name when none is present in the page", () => {
    const result = extractJobPostingFromHtml(html);
    expect(result.companyName).toBeNull();
  });
});

describe("normalizeLanguageName", () => {
  it("maps common English language names to the app's canonical French names", () => {
    expect(normalizeLanguageName("English")).toBe("Anglais");
    expect(normalizeLanguageName("french")).toBe("Français");
    expect(normalizeLanguageName("German")).toBe("Allemand");
  });

  it("leaves already-canonical or unknown names untouched", () => {
    expect(normalizeLanguageName("Anglais")).toBe("Anglais");
    expect(normalizeLanguageName("Klingon")).toBe("Klingon");
  });
});

describe("extractJobPostingFromHtml — boilerplate stripping", () => {
  it("drops recurring page chrome (cookies, nav, footer) rather than letting it crowd out the real posting", () => {
    const html = `<html><head><title>Marketing Intern - Acme Corp</title></head>
      <body>
        <nav><div>Accueil</div><div>Carrières</div><div>Contact</div><div>Se connecter</div></nav>
        <div>Accepter tous les cookies</div>
        <h1>Marketing Intern</h1>
        <p>Missions : support the marketing team on campaigns. Requirements: Excel and SQL.</p>
        <div>Partager sur LinkedIn</div>
        <footer><div>© 2026 Acme Corp — Tous droits réservés</div></footer>
      </body></html>`;
    const result = extractJobPostingFromHtml(html);
    expect(result.rawText).toContain("Marketing Intern");
    expect(result.rawText).toContain("support the marketing team");
    expect(result.rawText.toLowerCase()).not.toContain("accepter tous les cookies");
    expect(result.rawText.toLowerCase()).not.toContain("se connecter");
    expect(result.rawText.toLowerCase()).not.toContain("tous droits réservés");
  });
});

describe("extractJobPostingFromText — manual paste fallback", () => {
  it("tags the extraction method as MANUAL_PASTE and still runs heuristics", () => {
    const text = "Stage Marketing chez une startup. Télétravail complet. Anglais courant requis.";
    const result = extractJobPostingFromText(text);
    expect(result.extractionMethod).toBe("MANUAL_PASTE");
    expect(result.remoteType).toBe("REMOTE");
    expect(result.requiredLanguages).toContain("Anglais");
    expect(result.contractType).toBe("Stage / Internship");
  });

  it("leaves every undetected field null rather than guessing", () => {
    const result = extractJobPostingFromText("Un texte très vague sans aucune information structurée.");
    expect(result.salaryAmount).toBeNull();
    expect(result.deadline).toBeNull();
    expect(result.requiredEducationLevel).toBeNull();
    expect(result.companyName).toBeNull();
  });

  it("never mistakes company longevity for a candidate experience requirement", () => {
    const result = extractJobPostingFromText(
      "About us: our company has 22 years of experience serving customers. We are hiring a software engineering intern.",
    );
    expect(result.requiredExperienceYears).toBeNull();
  });

  it("still detects an explicit candidate experience requirement", () => {
    const result = extractJobPostingFromText(
      "Qualifications: candidates must have at least 2 years of professional experience with NodeJS and Postgres.",
    );
    expect(result.requiredExperienceYears).toBe(2);
    expect(result.requiredSkills).toEqual(expect.arrayContaining(["Node.js", "PostgreSQL"]));
  });

  it("does not turn an inclusive undergrad-to-PhD range into a PhD requirement", () => {
    const result = extractJobPostingFromText(
      "**Spring 2027 Engineering Intern&#x20;** Whether you’re an undergrad or a PhD student, your contributions matter.",
    );
    expect(result.requiredEducationLevel).toBeNull();
    expect(result.rawText).not.toContain("&#x20;");
  });
});
