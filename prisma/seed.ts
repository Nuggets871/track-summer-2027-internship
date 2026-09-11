/**
 * Demo data seed. Everything created here is flagged `isDemo: true` wherever
 * the schema allows it, and is described in the UI as fictional sample data
 * — never presented as the user's real applications. Use the
 * "Supprimer les données de démo" button in Settings > Données & backup to
 * wipe it once you start tracking your own search.
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { DEFAULT_PIPELINE_STAGES, DEFAULT_CURRENCIES, DEFAULT_MATCH_WEIGHTS } from "../src/lib/constants";
import { computeJobMatch, computeEligibility } from "../src/lib/job-matching";
import { extractTextFromCvFile } from "../src/lib/cv-file-text";

const prisma = new PrismaClient();

function daysFromNow(n: number) {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

const DEMO_PROFILE = {
  firstName: "Alex",
  lastName: "Martin",
  email: "alex.martin@example.com",
  phone: "+33 6 12 34 56 78",
  educationLevel: "MASTER",
  fieldOfStudy: "Finance",
  graduationYear: 2027,
  yearsOfExperience: 1,
  skills: ["Excel", "PowerPoint", "Financial Modeling", "Valorisation", "Python"],
  languages: [
    { language: "Français", level: "NATIVE" },
    { language: "Anglais", level: "FLUENT" },
    { language: "Espagnol", level: "INTERMEDIATE" },
  ],
  experiences: [
    {
      title: "Stagiaire Corporate Finance",
      company: "Atlas Partners",
      startDate: "2025-06",
      endDate: "2025-08",
      description: "Analyse financière et préparation de mémos d'investissement pour des opérations de M&A.",
    },
  ],
  workAuthorization: "Citoyen UE — droit de travailler sans visa dans l'UE/EEE. À vérifier au cas par cas ailleurs.",
  availabilityNote: "Disponible pour un stage de 3 à 6 mois à partir de l'été 2027.",
};

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Settings singleton -----------------------------------------------
  await prisma.setting.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      userName: "",
      userEmail: "",
      preferredCurrencies: JSON.stringify(DEFAULT_CURRENCIES),
      preferredCountries: JSON.stringify(["Royaume-Uni", "Singapour", "Suisse"]),
      preferredSectors: JSON.stringify(["Finance", "Tech", "Conseil"]),
    },
    update: {},
  });

  // 2. Candidate profile (used by the Match Score) ------------------------
  const profileRow = await prisma.profile.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      firstName: DEMO_PROFILE.firstName,
      lastName: DEMO_PROFILE.lastName,
      email: DEMO_PROFILE.email,
      phone: DEMO_PROFILE.phone,
      educationLevel: DEMO_PROFILE.educationLevel,
      fieldOfStudy: DEMO_PROFILE.fieldOfStudy,
      graduationYear: DEMO_PROFILE.graduationYear,
      yearsOfExperience: DEMO_PROFILE.yearsOfExperience,
      skills: JSON.stringify(DEMO_PROFILE.skills),
      languages: JSON.stringify(DEMO_PROFILE.languages),
      experiences: JSON.stringify(DEMO_PROFILE.experiences),
      workAuthorization: DEMO_PROFILE.workAuthorization,
      availabilityNote: DEMO_PROFILE.availabilityNote,
    },
    update: {},
  });

  // 2b. Reference cover letter — if a local file was dropped in local-assets/,
  // import its text into the profile. Local-only data: the folder is
  // gitignored, so this step is simply skipped when the file is absent. In
  // Docker, the equivalent step runs at container start (see Dockerfile).
  const referencePath = path.join(process.cwd(), "local-assets", "reference-cover-letter.pdf");
  if (existsSync(referencePath) && !profileRow.coverLetterReference) {
    try {
      const referenceText = await extractTextFromCvFile(readFileSync(referencePath), "reference-cover-letter.pdf", "application/pdf");
      if (referenceText.trim()) {
        const referenceDocument = await prisma.document.create({
          data: {
            name: "Lettre de motivation de référence",
            category: "COVER_LETTER",
            version: "v1",
            filePath: "reference-cover-letter.pdf",
            fileSize: readFileSync(referencePath).length,
            mimeType: "application/pdf",
          },
        });
        await prisma.profile.update({
          where: { id: "singleton" },
          data: { coverLetterReference: referenceText, coverLetterReferenceDocumentId: referenceDocument.id },
        });
        console.log("✉️  Lettre de motivation de référence importée depuis local-assets/.");
      }
    } catch (error) {
      console.warn("Lettre de référence non importée :", error instanceof Error ? error.message : error);
    }
  }

  // 3. Pipeline stages (7 statuses) ----------------------------------------
  const existingStages = await prisma.pipelineStage.count({ where: { kind: "APPLICATION" } });
  if (existingStages === 0) {
    await prisma.pipelineStage.createMany({
      data: DEFAULT_PIPELINE_STAGES.map((s) => ({ ...s, isSystem: true, kind: "APPLICATION" })),
    });
  }
  const stages = await prisma.pipelineStage.findMany({ where: { kind: "APPLICATION" } });
  const stage = (key: string) => stages.find((s) => s.key === key)!.id;

  // 4. Countries ------------------------------------------------------------
  const countryDefs = [
    { name: "Royaume-Uni" },
    { name: "Singapour" },
    { name: "Suisse" },
    { name: "Allemagne" },
    { name: "Pays-Bas" },
    { name: "États-Unis" },
    { name: "Canada" },
  ];
  const countries: Record<string, string> = {};
  for (const c of countryDefs) {
    const country = await prisma.country.upsert({
      where: { name: c.name },
      create: { name: c.name },
      update: {},
    });
    countries[c.name] = country.id;
  }
  for (const [countryName, cityName] of [
    ["Royaume-Uni", "Londres"],
    ["Suisse", "Zurich"],
    ["Singapour", "Singapour"],
    ["Allemagne", "Berlin"],
    ["Pays-Bas", "Amsterdam"],
    ["États-Unis", "San Francisco"],
    ["Canada", "Toronto"],
  ]) {
    await prisma.city.upsert({
      where: { name_countryId: { name: cityName, countryId: countries[countryName] } },
      create: { name: cityName, countryId: countries[countryName] },
      update: {},
    });
  }
  const cities = await prisma.city.findMany();
  const cityId = (name: string) => cities.find((c) => c.name === name)?.id;

  // 5. Companies --------------------------------------------------------------
  const companyDefs = [
    { name: "Meridian Bank International", country: "Royaume-Uni", sector: "Finance" },
    { name: "Polaris FinTech", country: "Suisse", sector: "Finance" },
    { name: "Vertex Analytics", country: "Singapour", sector: "Tech" },
    { name: "Vantage Point Consulting", country: "Royaume-Uni", sector: "Conseil" },
    { name: "Nimbus Cloud Systems", country: "Pays-Bas", sector: "Tech" },
    { name: "Ironbridge Engineering", country: "Allemagne", sector: "Industrie" },
    { name: "Lumen Digital Ventures", country: "Canada", sector: "Tech" },
    { name: "Kestrel Aerospace", country: "États-Unis", sector: "Aérospatial" },
  ];
  const companies: Record<string, string> = {};
  for (const c of companyDefs) {
    const company = await prisma.company.create({
      data: { name: c.name, countryId: countries[c.country], sector: c.sector, isDemo: true },
    });
    companies[c.name] = company.id;
  }

  // 6. Applications (opportunities), spanning the 7 statuses ------------------
  type AppDef = {
    title: string;
    company: string;
    country: string;
    city?: string;
    sector: string;
    source: string;
    statusKey: string;
    discovered: number;
    applied?: number;
    deadline?: number;
    salary?: number;
    currency?: string;
    nextAction?: string;
    nextActionDays?: number;
    jobUrl?: string;
    withAnalysis?: { requiredSkills: string[]; requiredLanguages: string[]; requiredEducationLevel: string; requiredExperienceYears: number; rawText: string };
  };

  const appDefs: AppDef[] = [
    {
      title: "Summer Analyst — M&A",
      company: "Meridian Bank International",
      country: "Royaume-Uni",
      city: "Londres",
      sector: "Finance",
      source: "Lien d'offre",
      statusKey: "INTERVIEW",
      discovered: -70,
      applied: -55,
      deadline: 5,
      salary: 4500,
      currency: "GBP",
      jobUrl: "https://meridianbankinternational.example.com/careers/intern",
      withAnalysis: {
        requiredSkills: ["Excel", "Financial Modeling", "PowerPoint", "Python", "Bloomberg"],
        requiredLanguages: ["Anglais"],
        requiredEducationLevel: "MASTER",
        requiredExperienceYears: 0,
        rawText:
          "Summer Analyst — M&A at Meridian Bank International, London. Responsibilities: support live M&A transactions, build financial models, prepare client presentations. Qualifications: Master's degree, strong Excel and PowerPoint skills, Python a plus, fluent English required. Graduating between 2027 and 2028.",
      },
    },
    {
      title: "Summer Intern — Payments Product",
      company: "Polaris FinTech",
      country: "Suisse",
      city: "Zurich",
      sector: "Finance",
      source: "Lien d'offre",
      statusKey: "INTERVIEW",
      discovered: -60,
      applied: -45,
      deadline: 12,
      salary: 5200,
      currency: "CHF",
      withAnalysis: {
        requiredSkills: ["Excel", "Python", "SQL"],
        requiredLanguages: ["Anglais"],
        requiredEducationLevel: "MASTER",
        requiredExperienceYears: 0,
        rawText: "Summer intern for our payments product team. Excel, Python and SQL skills expected. Fluent English required.",
      },
    },
    {
      title: "Data Science Intern",
      company: "Vertex Analytics",
      country: "Singapour",
      city: "Singapour",
      sector: "Tech",
      source: "Candidature spontanée",
      statusKey: "APPLIED",
      discovered: -40,
      applied: -20,
      deadline: 8,
      salary: 3800,
      currency: "SGD",
    },
    {
      title: "Strategy Intern",
      company: "Vantage Point Consulting",
      country: "Royaume-Uni",
      city: "Londres",
      sector: "Conseil",
      source: "Événement / salon",
      statusKey: "APPLIED",
      discovered: -35,
      applied: -18,
      deadline: 20,
      salary: 4000,
      currency: "GBP",
    },
    {
      title: "Software Engineering Intern",
      company: "Nimbus Cloud Systems",
      country: "Pays-Bas",
      city: "Amsterdam",
      sector: "Tech",
      source: "Lien d'offre",
      statusKey: "PREPARING",
      discovered: -10,
      nextAction: "Finir la lettre de motivation",
      nextActionDays: 1,
    },
    {
      title: "Automation Engineering Intern",
      company: "Ironbridge Engineering",
      country: "Allemagne",
      city: "Berlin",
      sector: "Industrie",
      source: "Site entreprise",
      statusKey: "SAVED",
      discovered: -3,
    },
    {
      title: "Growth & Ops Intern",
      company: "Lumen Digital Ventures",
      country: "Canada",
      city: "Toronto",
      sector: "Tech",
      source: "Networking",
      statusKey: "OFFER",
      discovered: -90,
      applied: -70,
      salary: 3600,
      currency: "CAD",
    },
    {
      title: "Propulsion Systems Intern",
      company: "Kestrel Aerospace",
      country: "États-Unis",
      city: "San Francisco",
      sector: "Aérospatial",
      source: "Job board",
      statusKey: "REJECTED",
      discovered: -80,
      applied: -60,
    },
  ];

  const applications: Record<string, string> = {};
  for (const a of appDefs) {
    const app = await prisma.application.create({
      data: {
        title: a.title,
        companyId: companies[a.company],
        countryId: countries[a.country],
        cityId: a.city ? cityId(a.city) : undefined,
        sector: a.sector,
        jobUrl: a.jobUrl,
        source: a.source,
        discoveredAt: daysFromNow(a.discovered),
        appliedAt: a.applied !== undefined ? daysFromNow(a.applied) : null,
        deadline: a.deadline !== undefined ? daysFromNow(a.deadline) : null,
        salaryAmount: a.salary,
        salaryCurrency: a.currency ?? "EUR",
        statusId: stage(a.statusKey),
        nextAction: a.nextAction,
        nextActionDate: a.nextActionDays !== undefined ? daysFromNow(a.nextActionDays) : null,
        lastInteractionAt: daysFromNow((a.applied ?? a.discovered) + 3),
        isDemo: true,
      },
    });
    applications[a.title] = app.id;

    if (a.withAnalysis) {
      const match = computeJobMatch(
        {
          educationLevel: DEMO_PROFILE.educationLevel,
          graduationYear: DEMO_PROFILE.graduationYear,
          yearsOfExperience: DEMO_PROFILE.yearsOfExperience,
          skills: DEMO_PROFILE.skills,
          languages: DEMO_PROFILE.languages,
          workAuthorization: DEMO_PROFILE.workAuthorization,
          availabilityNote: DEMO_PROFILE.availabilityNote,
        },
        { ...a.withAnalysis, countryName: a.country, remoteType: null, sector: a.sector },
        DEFAULT_MATCH_WEIGHTS,
        { preferredCountries: ["Royaume-Uni", "Singapour", "Suisse"], preferredSectors: ["Finance", "Tech", "Conseil"] },
      );
      const eligibility = computeEligibility(
        {
          educationLevel: DEMO_PROFILE.educationLevel,
          graduationYear: DEMO_PROFILE.graduationYear,
          yearsOfExperience: DEMO_PROFILE.yearsOfExperience,
          skills: DEMO_PROFILE.skills,
          languages: DEMO_PROFILE.languages,
          workAuthorization: DEMO_PROFILE.workAuthorization,
          availabilityNote: DEMO_PROFILE.availabilityNote,
        },
        { ...a.withAnalysis, countryName: a.country, remoteType: null, sector: a.sector },
      );

      await prisma.jobAnalysis.create({
        data: {
          applicationId: app.id,
          sourceUrl: a.jobUrl,
          extractionMethod: "STRUCTURED_DATA",
          rawExtractedText: a.withAnalysis.rawText,
          requiredSkills: JSON.stringify(a.withAnalysis.requiredSkills),
          requiredLanguages: JSON.stringify(a.withAnalysis.requiredLanguages),
          requiredEducationLevel: a.withAnalysis.requiredEducationLevel,
          requiredExperienceYears: a.withAnalysis.requiredExperienceYears,
          contractType: "Stage / Internship",
          matchScore: match.total,
          matchBreakdown: JSON.stringify(match.factors),
          strengths: JSON.stringify(match.strengths),
          watchouts: JSON.stringify(match.watchouts),
          missingSkills: JSON.stringify(match.missingSkills),
          recommendation: match.recommendation,
          eligibilityStatus: eligibility.status,
          eligibilityNotes: JSON.stringify(eligibility.notes),
          profileUpdatedAtSnapshot: new Date(),
        },
      });
    }
  }

  // 7. A demo CV + cover letter, so Profile/Opportunity pages aren't empty --
  const uploadsDir = path.join(process.cwd(), "uploads");
  mkdirSync(uploadsDir, { recursive: true });
  const cvText = `Alex Martin
alex.martin@example.com — +33 6 12 34 56 78

Formation
Master Finance, 2027 (en cours)

Expérience
Stagiaire Corporate Finance — Atlas Partners (juin-août 2025)
Analyse financière et préparation de mémos d'investissement pour des opérations de M&A.

Compétences : Excel, PowerPoint, Financial Modeling, Valorisation, Python
Langues : Français (natif), Anglais (courant), Espagnol (intermédiaire)`;
  writeFileSync(path.join(uploadsDir, "demo-cv.txt"), cvText, "utf-8");
  const cvDocument = await prisma.document.create({
    data: { name: "CV_Alex_Martin", category: "CV", version: "v1", filePath: "demo-cv.txt", fileSize: Buffer.byteLength(cvText), mimeType: "text/plain" },
  });
  await prisma.profile.update({ where: { id: "singleton" }, data: { cvDocumentId: cvDocument.id, cvRawText: cvText, cvParsedAt: new Date() } });

  await prisma.coverLetter.create({
    data: {
      applicationId: applications["Summer Analyst — M&A"],
      companyId: companies["Meridian Bank International"],
      status: "READY",
      version: "v1",
      tone: "PROFESSIONAL",
      language: "FR",
      content:
        "Madame, Monsieur,\n\nJe me permets de vous adresser ma candidature pour le poste de Summer Analyst — M&A au sein de Meridian Bank International.\n\nMon profil correspond particulièrement bien à cette offre, notamment grâce à mes compétences en Excel, Financial Modeling et Python. Ma formation en Finance m'a permis de développer une solide compréhension des mécaniques de valorisation et de modélisation financière.\n\nJe serais ravi d'échanger avec vous pour vous présenter plus en détail ma motivation.\n\nCordialement,",
      personalizedElements: "Excel, Financial Modeling, Python",
    },
  });

  console.log("✅ Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
