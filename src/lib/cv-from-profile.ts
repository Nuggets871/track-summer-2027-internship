import type { AppProfile } from "@/lib/data/profile";
import type { CvContent, CvEntry, CvSection } from "@/lib/cv-content";
import { LANGUAGE_LEVELS, labelFor } from "@/lib/constants";
import { emptyCvContent } from "@/lib/cv-content";

// Deterministic fallback used when no AI key is configured: it turns the
// structured profile into a plain, correct CV — never a blank page. It is also
// the safety net if the AI call fails (see generateCvForApplication).

function toBullets(description: string | null): string[] {
  if (!description) return [];
  return description
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.replace(/^[-•\s]+/, "").trim())
    .filter(Boolean);
}

function dateRange(startDate: string | null, endDate: string | null, isCurrentLabel: string): string | null {
  const start = startDate?.trim() || null;
  const end = endDate?.trim() || null;
  if (!start && !end) return null;
  return `${start ?? ""}${start && end ? " → " : ""}${end ?? (start ? isCurrentLabel : "")}`.trim();
}

export function buildCvFromProfile(profile: AppProfile, language: "FR" | "EN"): CvContent {
  const content = emptyCvContent();
  content.headline = profile.headline ?? profile.fieldOfStudy ?? null;
  content.summary = profile.summary ?? null;

  const sections: CvSection[] = [];
  const en = language === "EN";

  if (profile.experiences.length > 0) {
    const entries: CvEntry[] = profile.experiences.map((experience, index) => ({
      id: `s${sections.length}e${index}`,
      heading: [experience.title, experience.company].filter(Boolean).join(" - "),
      meta: dateRange(experience.startDate, experience.endDate, en ? "Present" : "Aujourd'hui"),
      bullets: toBullets(experience.description),
      tags: [],
    }));
    sections.push({ id: `s${sections.length}`, title: en ? "Professional experience" : "Expérience professionnelle", entries });
  }

  if (profile.educationHistory.length > 0) {
    const sectionIndex = sections.length;
    const entries: CvEntry[] = profile.educationHistory.map((education, index) => ({
      id: `s${sectionIndex}e${index}`,
      heading: [education.degree, education.institution].filter(Boolean).join(" - "),
      meta: dateRange(education.startDate, education.endDate, en ? "Present" : "Aujourd'hui"),
      bullets: toBullets(education.description),
      tags: [],
    }));
    sections.push({ id: `s${sectionIndex}`, title: en ? "Education" : "Formation", entries });
  }

  if (profile.projects.length > 0) {
    const sectionIndex = sections.length;
    const entries: CvEntry[] = profile.projects.map((project, index) => ({
      id: `s${sectionIndex}e${index}`,
      heading: project.name,
      meta: project.url ?? project.repositoryUrl ?? null,
      bullets: toBullets(project.description),
      tags: project.technologies,
    }));
    sections.push({ id: `s${sectionIndex}`, title: en ? "Projects" : "Projets", entries });
  }

  if (profile.skills.length > 0) {
    const sectionIndex = sections.length;
    sections.push({
      id: `s${sectionIndex}`,
      title: en ? "Skills" : "Compétences",
      entries: [{ id: `s${sectionIndex}e0`, heading: "", meta: null, bullets: [], tags: profile.skills }],
    });
  }

  if (profile.languages.length > 0) {
    const sectionIndex = sections.length;
    sections.push({
      id: `s${sectionIndex}`,
      title: en ? "Languages" : "Langues",
      entries: [
        {
          id: `s${sectionIndex}e0`,
          heading: "",
          meta: null,
          bullets: profile.languages.map((language) => `${language.language} — ${labelFor(LANGUAGE_LEVELS, language.level)}`),
          tags: [],
        },
      ],
    });
  }

  content.sections = sections;
  return content;
}
