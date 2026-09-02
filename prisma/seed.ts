/**
 * Demo data seed. Everything created here is flagged `isDemo: true` wherever
 * the schema allows it, and is described in the UI as fictional sample data
 * — never presented as the user's real applications. Use the
 * "Supprimer les données de démo" button in Settings > Données & backup to
 * wipe it once you start tracking your own search.
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DEFAULT_PIPELINE_STAGES, DEFAULT_SOURCES, DEFAULT_CURRENCIES, DEFAULT_PRIORITY_WEIGHTS, DEFAULT_MATCH_WEIGHTS } from "../src/lib/constants";
import { computeCompanyFitScore } from "../src/lib/scoring";
import { computeJobMatch, computeEligibility } from "../src/lib/job-matching";

const prisma = new PrismaClient();

function daysFromNow(n: number) {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Settings singleton -----------------------------------------------
  await prisma.setting.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      userName: "",
      userEmail: "",
      sourceOptions: JSON.stringify(DEFAULT_SOURCES),
      preferredCurrencies: JSON.stringify(DEFAULT_CURRENCIES),
      preferredCountries: JSON.stringify(["Royaume-Uni", "Singapour", "Suisse"]),
      preferredSectors: JSON.stringify(["Finance", "Tech", "Conseil"]),
      priorityWeights: JSON.stringify(DEFAULT_PRIORITY_WEIGHTS),
      matchWeights: JSON.stringify(DEFAULT_MATCH_WEIGHTS),
    },
    update: {},
  });

  // 1bis. Candidate profile (used by the "add by link" match scoring) -----
  await prisma.profile.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      educationLevel: "MASTER",
      fieldOfStudy: "Finance",
      graduationYear: 2027,
      yearsOfExperience: 1,
      skills: JSON.stringify(["Excel", "PowerPoint", "Financial Modeling", "Valorisation", "Python"]),
      languages: JSON.stringify([
        { language: "Français", level: "NATIVE" },
        { language: "Anglais", level: "FLUENT" },
        { language: "Espagnol", level: "INTERMEDIATE" },
      ]),
      workAuthorization: "Citoyen UE — droit de travailler sans visa dans l'UE/EEE. À vérifier au cas par cas ailleurs.",
      availabilityNote: "Disponible pour un stage de 3 à 6 mois à partir de l'été 2027.",
    },
    update: {},
  });

  // 2. Pipeline stages ----------------------------------------------------
  const existingStages = await prisma.pipelineStage.count({ where: { kind: "APPLICATION" } });
  if (existingStages === 0) {
    await prisma.pipelineStage.createMany({
      data: DEFAULT_PIPELINE_STAGES.map((s) => ({ ...s, isSystem: true, kind: "APPLICATION" })),
    });
  }
  const stages = await prisma.pipelineStage.findMany({ where: { kind: "APPLICATION" } });
  const stage = (key: string) => stages.find((s) => s.key === key)!.id;

  // 3. Countries & cities --------------------------------------------------
  const countryDefs = [
    { name: "Royaume-Uni", code: "GB", region: "Europe", personalPreference: 5, visaNotes: "Visa Graduate/Skilled Worker requis pour les stages long format — vérifier le sponsorship. (note perso, pas un conseil juridique)", costOfLivingNotes: "Londres très cher, autres villes plus abordables.", cities: ["Londres", "Manchester", "Édimbourg"] },
    { name: "Singapour", code: "SG", region: "Asie", personalPreference: 4, visaNotes: "Work Pass généralement géré par l'employeur pour les stages. (note perso)", costOfLivingNotes: "Coût de la vie élevé, logement surtout.", cities: ["Singapour"] },
    { name: "Suisse", code: "CH", region: "Europe", personalPreference: 5, visaNotes: "Permis de courte durée (L) pour stage, sponsoring entreprise nécessaire hors UE/AELE. (note perso)", costOfLivingNotes: "Salaires élevés mais vie très chère (Zurich, Genève).", cities: ["Zurich", "Genève"] },
    { name: "Émirats arabes unis", code: "AE", region: "Moyen-Orient", personalPreference: 3, visaNotes: "Visa stage/emploi sponsorisé par l'entreprise. (note perso)", costOfLivingNotes: "Pas d'impôt sur le revenu, logement variable.", cities: ["Dubaï", "Abou Dabi"] },
    { name: "Allemagne", code: "DE", region: "Europe", personalPreference: 4, visaNotes: "Stage possible avec visa étudiant/stagiaire selon durée. (note perso)", costOfLivingNotes: "Berlin et Munich raisonnables comparé à Londres.", cities: ["Berlin", "Munich", "Francfort"] },
    { name: "Pays-Bas", code: "NL", region: "Europe", personalPreference: 4, visaNotes: "Titre de séjour stage via l'employeur si hors UE. (note perso)", costOfLivingNotes: "Amsterdam cher, logement tendu.", cities: ["Amsterdam", "Rotterdam"] },
    { name: "États-Unis", code: "US", region: "Amérique du Nord", personalPreference: 3, visaNotes: "Visa J-1 (stagiaire) fréquent, CPT/OPT si déjà étudiant aux US. (note perso, à vérifier au cas par cas)", costOfLivingNotes: "Très variable selon la ville (NYC/SF chers).", cities: ["New York", "San Francisco"] },
    { name: "Canada", code: "CA", region: "Amérique du Nord", personalPreference: 4, visaNotes: "Permis de travail co-op ou IEC selon profil. (note perso)", costOfLivingNotes: "Toronto et Vancouver chers, reste plus abordable.", cities: ["Toronto", "Vancouver"] },
    { name: "Hong Kong", code: "HK", region: "Asie", personalPreference: 3, visaNotes: "Visa stagiaire sponsorisé par l'entreprise. (note perso)", costOfLivingNotes: "Logement très cher.", cities: ["Hong Kong"] },
    { name: "Irlande", code: "IE", region: "Europe", personalPreference: 3, visaNotes: "Stage facilité au sein de l'UE/EEE.", costOfLivingNotes: "Dublin cher, marché du logement tendu.", cities: ["Dublin"] },
  ];

  const countries: Record<string, string> = {};
  for (const c of countryDefs) {
    const country = await prisma.country.upsert({
      where: { name: c.name },
      create: {
        name: c.name,
        code: c.code,
        region: c.region,
        personalPreference: c.personalPreference,
        visaNotes: c.visaNotes,
        costOfLivingNotes: c.costOfLivingNotes,
        usefulLinks: JSON.stringify([{ label: "Site officiel visa (à vérifier)", url: "https://example.com" }]),
      },
      update: {},
    });
    countries[c.name] = country.id;
    for (const cityName of c.cities) {
      await prisma.city.upsert({
        where: { name_countryId: { name: cityName, countryId: country.id } },
        create: { name: cityName, countryId: country.id },
        update: {},
      });
    }
  }
  const cities = await prisma.city.findMany();
  const cityId = (name: string) => cities.find((c) => c.name === name)?.id;

  // 4. Tags -----------------------------------------------------------------
  const tagDefs = ["Finance", "Tech", "Conseil", "Prioritaire", "Alumni", "Remote-friendly"];
  const tags: Record<string, string> = {};
  for (const name of tagDefs) {
    const tag = await prisma.tag.upsert({ where: { name }, create: { name, color: "#6366f1" }, update: {} });
    tags[name] = tag.id;
  }

  // 5. Companies --------------------------------------------------------------
  const companyDefs = [
    { name: "Meridian Bank International", country: "Royaume-Uni", cities: "Londres", sector: "Finance", type: "Banque", size: "1000+", interestLevel: 5, wishlist: "DREAM", description: "Banque d'investissement paneuropéenne, forte présence M&A.", website: "https://meridianbank.example.com" },
    { name: "Polaris FinTech", country: "Suisse", cities: "Zurich", sector: "Finance", type: "Scale-up", size: "201-1000", interestLevel: 5, wishlist: "DREAM", description: "Scale-up fintech spécialisée en paiements transfrontaliers.", website: "https://polarisfintech.example.com" },
    { name: "Vertex Analytics", country: "Singapour", cities: "Singapour", sector: "Tech", type: "Grand groupe", size: "1000+", interestLevel: 4, wishlist: "HIGH_PRIORITY", description: "Cabinet de data science et analytics pour la finance.", website: "https://vertexanalytics.example.com" },
    { name: "Vantage Point Consulting", country: "Royaume-Uni", cities: "Londres", sector: "Conseil", type: "Cabinet de conseil", size: "1000+", interestLevel: 4, wishlist: "HIGH_PRIORITY", description: "Cabinet de conseil en stratégie, bureaux dans 20 pays.", website: "https://vantagepoint.example.com" },
    { name: "Nimbus Cloud Systems", country: "Pays-Bas", cities: "Amsterdam", sector: "Tech", type: "Scale-up", size: "201-1000", interestLevel: 4, wishlist: "TARGET", description: "Infrastructure cloud pour PME européennes.", website: "https://nimbuscloud.example.com" },
    { name: "Cobalt Trading House", country: "Émirats arabes unis", cities: "Dubaï", sector: "Finance", type: "Banque", size: "1000+", interestLevel: 3, wishlist: "TARGET", description: "Trading de matières premières et devises.", website: "https://cobalttrading.example.com" },
    { name: "Faro Biotech", country: "Allemagne", cities: "Berlin", sector: "Santé", type: "Startup", size: "51-200", interestLevel: 3, wishlist: "EXPLORATORY", description: "Biotech spécialisée en diagnostics.", website: "https://farobiotech.example.com" },
    { name: "Ironbridge Engineering", country: "Allemagne", cities: "Munich", sector: "Industrie", type: "Grand groupe", size: "1000+", interestLevel: 3, wishlist: "TARGET", description: "Ingénierie mécanique et automatisation.", website: "https://ironbridge.example.com" },
    { name: "Sable & Co Advisory", country: "Hong Kong", cities: "Hong Kong", sector: "Conseil", type: "Cabinet de conseil", size: "201-1000", interestLevel: 3, wishlist: "TARGET", description: "Conseil financier pour groupes familiaux asiatiques.", website: "https://sableco.example.com" },
    { name: "Lumen Digital Ventures", country: "Canada", cities: "Toronto", sector: "Tech", type: "Startup", size: "11-50", interestLevel: 4, wishlist: "TARGET", description: "Studio de venture building spécialisé produit digital.", website: "https://lumendigital.example.com" },
    { name: "Kestrel Aerospace", country: "États-Unis", cities: "San Francisco", sector: "Aérospatial", type: "Startup", size: "51-200", interestLevel: 5, wishlist: "DREAM", description: "Startup spatiale, propulsion et satellites.", website: "https://kestrelaero.example.com" },
    { name: "Greenfield AgriTech", country: "Pays-Bas", cities: "Rotterdam", sector: "AgriTech", type: "PME", size: "51-200", interestLevel: 2, wishlist: "BACKUP", description: "Solutions agricoles durables basées sur la donnée.", website: "https://greenfieldagritech.example.com" },
    { name: "Ondine Luxury Group", country: "Royaume-Uni", cities: "Londres", sector: "Luxe", type: "Grand groupe", size: "1000+", interestLevel: 3, wishlist: "EXPLORATORY", description: "Groupe de maisons de luxe, retail et digital.", website: "https://ondineluxury.example.com" },
    { name: "Atlas & Frost Legal", country: "Irlande", cities: "Dublin", sector: "Juridique", type: "Cabinet d'avocats", size: "201-1000", interestLevel: 2, wishlist: "BACKUP", description: "Cabinet d'avocats d'affaires international.", website: "https://atlasfrost.example.com" },
    { name: "Solaris Consulting Group", country: "Canada", cities: "Vancouver", sector: "Conseil", type: "Cabinet de conseil", size: "201-1000", interestLevel: 3, wishlist: "BACKUP", description: "Conseil en transformation durable.", website: "https://solarisconsulting.example.com" },
  ];

  const companies: Record<string, string> = {};
  for (const c of companyDefs) {
    const company = await prisma.company.create({
      data: {
        name: c.name,
        website: c.website,
        linkedin: `https://linkedin.com/company/${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        countryId: countries[c.country],
        citiesText: c.cities,
        sector: c.sector,
        type: c.type,
        size: c.size,
        description: c.description,
        interestLevel: c.interestLevel,
        wishlistCategory: c.wishlist,
        wishlistProgress: Math.round(Math.random() * 60) + 10,
        isDemo: true,
      },
    });
    companies[c.name] = company.id;
  }

  // 6. Contacts ---------------------------------------------------------------
  const contactDefs = [
    { first: "Alice", last: "Moreau", company: "Meridian Bank International", position: "Campus Recruiter", type: "RECRUITER", strength: 3 },
    { first: "Julien", last: "Petit", company: "Meridian Bank International", position: "VP M&A", type: "MANAGER", strength: 2 },
    { first: "Sofia", last: "Keller", company: "Polaris FinTech", position: "Talent Acquisition Lead", type: "HR", strength: 4 },
    { first: "Marcus", last: "Lindgren", company: "Vertex Analytics", position: "Head of Data Science", type: "MANAGER", strength: 3 },
    { first: "Emma", last: "Wilson", company: "Vantage Point Consulting", position: "HR Business Partner", type: "HR", strength: 2 },
    { first: "Chloé", last: "Dubois", company: null, position: "Alumni — promo 2024", type: "ALUMNI", strength: 4 },
    { first: "Ravi", last: "Nair", company: "Nimbus Cloud Systems", position: "Engineering Manager", type: "MANAGER", strength: 3 },
    { first: "Fatima", last: "Al Suwaidi", company: "Cobalt Trading House", position: "Recruiter", type: "RECRUITER", strength: 2 },
    { first: "Lukas", last: "Meier", company: "Faro Biotech", position: "Co-fondateur", type: "FOUNDER", strength: 3 },
    { first: "Yuki", last: "Tanaka", company: "Sable & Co Advisory", position: "Analyst", type: "EMPLOYEE", strength: 3 },
    { first: "Noah", last: "Bergström", company: "Lumen Digital Ventures", position: "Founder", type: "FOUNDER", strength: 4 },
    { first: "Camille", last: "Fontaine", company: null, position: "Professeure — Finance internationale", type: "PROFESSOR", strength: 3 },
    { first: "Daniel", last: "Osei", company: "Kestrel Aerospace", position: "University Recruiter", type: "RECRUITER", strength: 2 },
    { first: "Priya", last: "Chandran", company: null, position: "Amie — travaille à Singapour", type: "PERSONAL", strength: 5 },
  ];

  const contacts: Record<string, string> = {};
  for (const c of contactDefs) {
    const contact = await prisma.contact.create({
      data: {
        firstName: c.first,
        lastName: c.last,
        companyId: c.company ? companies[c.company] : null,
        position: c.position,
        email: `${c.first.toLowerCase()}.${c.last.toLowerCase()}@example.com`,
        linkedin: `https://linkedin.com/in/${c.first.toLowerCase()}-${c.last.toLowerCase()}`,
        contactType: c.type,
        relationshipStrength: c.strength,
        firstContactDate: daysFromNow(-Math.round(Math.random() * 60) - 5),
        lastInteractionAt: daysFromNow(-Math.round(Math.random() * 25)),
        networkingStage: ["IDENTIFIED", "TO_CONTACT", "CONTACTED", "RESPONDED", "CALL", "ACTIVE_RELATION", "REFERRAL"][
          Math.floor(Math.random() * 7)
        ],
        linkedinRequestSent: true,
        linkedinAccepted: Math.random() > 0.3,
        isDemo: true,
      },
    });
    contacts[`${c.first} ${c.last}`] = contact.id;
  }

  // 7. Applications -------------------------------------------------------
  type AppDef = {
    title: string;
    company: string;
    country: string;
    city?: string;
    sector: string;
    department?: string;
    remote?: boolean;
    source: string;
    contact?: string;
    statusKey: string;
    priority: string;
    interestScore: number;
    probability: number;
    discovered: number;
    applied?: number;
    deadline?: number;
    start?: number;
    duration?: number;
    salary?: number;
    currency?: string;
    housing?: boolean;
    visa?: boolean;
    sponsorship?: boolean;
    lang?: string;
    nextAction?: string;
    nextActionDays?: number;
    followUps?: number;
    tags?: string[];
  };

  const appDefs: AppDef[] = [
    { title: "Summer Analyst — M&A", company: "Meridian Bank International", country: "Royaume-Uni", city: "Londres", sector: "Finance", department: "M&A", source: "Site entreprise", contact: "Alice Moreau", statusKey: "INTERVIEW_FINAL", priority: "DREAM", interestScore: 95, probability: 55, discovered: -70, applied: -55, deadline: 5, start: 270, duration: 3, salary: 4500, currency: "GBP", housing: false, visa: true, sponsorship: true, lang: "Anglais courant", tags: ["Finance", "Prioritaire"] },
    { title: "Summer Intern — Payments Product", company: "Polaris FinTech", country: "Suisse", city: "Zurich", sector: "Finance", department: "Product", source: "LinkedIn", contact: "Sofia Keller", statusKey: "INTERVIEW_MANAGER", priority: "DREAM", interestScore: 92, probability: 60, discovered: -60, applied: -45, deadline: 12, start: 260, duration: 4, salary: 5200, currency: "CHF", visa: true, sponsorship: true, lang: "Anglais", tags: ["Finance", "Prioritaire"] },
    { title: "Data Science Intern", company: "Vertex Analytics", country: "Singapour", city: "Singapour", sector: "Tech", department: "Data", source: "Candidature spontanée", contact: "Marcus Lindgren", statusKey: "ASSESSMENT", priority: "HIGH", interestScore: 85, probability: 45, discovered: -40, applied: -20, deadline: 8, salary: 3800, currency: "SGD", visa: true, sponsorship: true, lang: "Anglais", tags: ["Tech"] },
    { title: "Strategy Intern", company: "Vantage Point Consulting", country: "Royaume-Uni", city: "Londres", sector: "Conseil", source: "Événement / salon", contact: "Emma Wilson", statusKey: "INTERVIEW_HR", priority: "HIGH", interestScore: 80, probability: 40, discovered: -35, applied: -18, deadline: 20, salary: 4000, currency: "GBP", visa: true, tags: ["Conseil"] },
    { title: "Software Engineering Intern", company: "Nimbus Cloud Systems", country: "Pays-Bas", city: "Amsterdam", sector: "Tech", department: "Engineering", source: "LinkedIn", contact: "Ravi Nair", statusKey: "RESPONSE_RECEIVED", priority: "MEDIUM", interestScore: 70, probability: 35, discovered: -25, applied: -10, deadline: 25, remote: true, salary: 3200, currency: "EUR", tags: ["Tech", "Remote-friendly"] },
    { title: "Commodities Trading Intern", company: "Cobalt Trading House", country: "Émirats arabes unis", city: "Dubaï", sector: "Finance", source: "Job board", contact: "Fatima Al Suwaidi", statusKey: "FOLLOW_UP", priority: "MEDIUM", interestScore: 65, probability: 30, discovered: -30, applied: -14, nextAction: "Relancer sur le statut de la candidature", nextActionDays: 0, followUps: 1, tags: ["Finance"] },
    { title: "R&D Intern — Diagnostics", company: "Faro Biotech", country: "Allemagne", city: "Berlin", sector: "Santé", source: "Alumni", statusKey: "SENT", priority: "LOW", interestScore: 55, probability: 25, discovered: -18, applied: -6, deadline: 40 },
    { title: "Automation Engineering Intern", company: "Ironbridge Engineering", country: "Allemagne", city: "Munich", sector: "Industrie", source: "Site entreprise", statusKey: "TO_PREPARE", priority: "MEDIUM", interestScore: 60, probability: 30, discovered: -10, tags: ["Tech"] },
    { title: "Financial Advisory Intern", company: "Sable & Co Advisory", country: "Hong Kong", city: "Hong Kong", sector: "Conseil", source: "Networking", contact: "Yuki Tanaka", statusKey: "TO_CONTACT", priority: "MEDIUM", interestScore: 58, probability: 20, discovered: -8 },
    { title: "Growth & Ops Intern", company: "Lumen Digital Ventures", country: "Canada", city: "Toronto", sector: "Tech", source: "Networking", contact: "Noah Bergström", statusKey: "OFFER", priority: "HIGH", interestScore: 88, probability: 90, discovered: -90, applied: -70, deadline: -10, start: 250, duration: 3, salary: 3600, currency: "CAD", visa: true, sponsorship: true, tags: ["Tech", "Alumni"] },
    { title: "Propulsion Systems Intern", company: "Kestrel Aerospace", country: "États-Unis", city: "San Francisco", sector: "Aérospatial", source: "Job board", contact: "Daniel Osei", statusKey: "REJECTED", priority: "DREAM", interestScore: 90, probability: 10, discovered: -80, applied: -60, tags: ["Prioritaire"] },
    { title: "Sustainability Data Intern", company: "Greenfield AgriTech", country: "Pays-Bas", city: "Rotterdam", sector: "AgriTech", source: "Site entreprise", statusKey: "TO_EXPLORE", priority: "LOW", interestScore: 40, probability: 20, discovered: -3 },
    { title: "Retail Strategy Intern", company: "Ondine Luxury Group", country: "Royaume-Uni", city: "Londres", sector: "Luxe", source: "LinkedIn", statusKey: "GHOSTED", priority: "LOW", interestScore: 50, probability: 15, discovered: -75, applied: -55 },
    { title: "Corporate Law Intern", company: "Atlas & Frost Legal", country: "Irlande", city: "Dublin", sector: "Juridique", source: "Candidature spontanée", statusKey: "TO_EXPLORE", priority: "LOW", interestScore: 35, probability: 15, discovered: -2 },
    { title: "Sustainable Transformation Intern", company: "Solaris Consulting Group", country: "Canada", city: "Vancouver", sector: "Conseil", source: "Recommandation", statusKey: "ABANDONED", priority: "LOW", interestScore: 30, probability: 10, discovered: -95, applied: -80 },
  ];

  const applications: Record<string, string> = {};
  for (const a of appDefs) {
    const app = await prisma.application.create({
      data: {
        title: a.title,
        companyId: companies[a.company],
        countryId: countries[a.country],
        cityId: a.city ? cityId(a.city) : undefined,
        remotePossible: a.remote ?? false,
        sector: a.sector,
        department: a.department,
        jobUrl: `https://${a.company.toLowerCase().replace(/[^a-z0-9]+/g, "")}.example.com/careers/intern`,
        source: a.source,
        primaryContactId: a.contact ? contacts[a.contact] : undefined,
        discoveredAt: daysFromNow(a.discovered),
        appliedAt: a.applied !== undefined ? daysFromNow(a.applied) : null,
        deadline: a.deadline !== undefined ? daysFromNow(a.deadline) : null,
        potentialStartDate: a.start !== undefined ? daysFromNow(a.start) : null,
        durationMonths: a.duration,
        salaryAmount: a.salary,
        salaryCurrency: a.currency ?? "EUR",
        housingProvided: a.housing ?? null,
        visaRequired: a.visa ?? null,
        sponsorshipPossible: a.sponsorship ?? null,
        languageRequired: a.lang,
        priority: a.priority,
        interestScore: a.interestScore,
        estimatedProbability: a.probability,
        statusId: stage(a.statusKey),
        nextAction: a.nextAction,
        nextActionDate: a.nextActionDays !== undefined ? daysFromNow(a.nextActionDays) : null,
        followUpCount: a.followUps ?? 0,
        lastInteractionAt: daysFromNow((a.applied ?? a.discovered) + 3),
        isDemo: true,
        tags: a.tags ? { connect: a.tags.map((t) => ({ id: tags[t] })) } : undefined,
      },
    });
    applications[a.title] = app.id;

    await prisma.interaction.create({
      data: {
        type: "NOTE",
        summary: `Candidature découverte via ${a.source}`,
        applicationId: app.id,
        companyId: companies[a.company],
        date: daysFromNow(a.discovered),
      },
    });
    if (a.applied !== undefined) {
      await prisma.interaction.create({
        data: {
          type: "EMAIL",
          summary: "Candidature envoyée",
          applicationId: app.id,
          companyId: companies[a.company],
          date: daysFromNow(a.applied),
        },
      });
    }
  }

  // 7bis. Compute each company's Fit Score from the data just created ------
  const preferredSectors = ["Finance", "Tech", "Conseil"];
  for (const [name, companyId] of Object.entries(companies)) {
    const companyDef = companyDefs.find((c) => c.name === name)!;
    const companyApps = appDefs.filter((a) => a.company === name);
    const countryPreference = countryDefs.find((c) => c.name === companyDef.country)?.personalPreference ?? null;
    const sectorMatches = preferredSectors.length === 0 ? null : preferredSectors.includes(companyDef.sector);
    const avgProbability =
      companyApps.length > 0 ? companyApps.reduce((s, a) => s + a.probability, 0) / companyApps.length : null;
    const sponsorshipValues = companyApps.filter((a) => a.sponsorship !== undefined);
    const sponsorshipFriendliness =
      sponsorshipValues.length > 0
        ? (sponsorshipValues.filter((a) => a.sponsorship).length / sponsorshipValues.length) * 100
        : null;

    const fit = computeCompanyFitScore({
      interestLevel: companyDef.interestLevel,
      countryPreference,
      sectorMatchesPreferences: sectorMatches,
      avgApplicationProbability: avgProbability,
      sponsorshipFriendliness,
    });

    await prisma.company.update({ where: { id: companyId }, data: { fitScore: fit.total } });
  }

  // 7ter. Demo "add by link" job analysis, so the feature is visible out of
  // the box without having to import a real offer first ---------------------
  {
    const demoJob = {
      requiredSkills: ["Excel", "Financial Modeling", "PowerPoint", "Python", "Bloomberg"],
      requiredLanguages: ["Anglais"],
      requiredEducationLevel: "MASTER",
      requiredExperienceYears: 0,
      countryName: "Royaume-Uni",
      remoteType: null as null,
      sector: "Finance",
      rawText:
        "Summer Analyst — M&A at Meridian Bank International, London. Responsibilities: support live M&A transactions, build financial models, prepare client presentations. Qualifications: Master's degree, strong Excel and PowerPoint skills, Python a plus, fluent English required. Graduating between 2027 and 2028.",
    };
    const profileForMatch = {
      educationLevel: "MASTER",
      graduationYear: 2027,
      yearsOfExperience: 1,
      skills: ["Excel", "PowerPoint", "Financial Modeling", "Valorisation", "Python"],
      languages: [
        { language: "Français", level: "NATIVE" },
        { language: "Anglais", level: "FLUENT" },
        { language: "Espagnol", level: "INTERMEDIATE" },
      ],
      workAuthorization: "Citoyen UE",
      availabilityNote: "Disponible été 2027",
    };
    const match = computeJobMatch(profileForMatch, demoJob, DEFAULT_MATCH_WEIGHTS, {
      preferredCountries: ["Royaume-Uni", "Singapour", "Suisse"],
      preferredSectors: ["Finance", "Tech", "Conseil"],
    });
    const eligibility = computeEligibility(profileForMatch, demoJob);

    await prisma.jobAnalysis.create({
      data: {
        applicationId: applications["Summer Analyst — M&A"],
        sourceUrl: "https://meridianbankinternational.example.com/careers/intern",
        extractionMethod: "STRUCTURED_DATA",
        rawExtractedText: demoJob.rawText,
        responsibilities: "Support live M&A transactions, build financial models, prepare client presentations.",
        qualifications: "Master's degree, strong Excel and PowerPoint skills, Python a plus, fluent English required.",
        requiredSkills: JSON.stringify(demoJob.requiredSkills),
        requiredLanguages: JSON.stringify(demoJob.requiredLanguages),
        requiredEducationLevel: demoJob.requiredEducationLevel,
        requiredExperienceYears: demoJob.requiredExperienceYears,
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

  // 8. Interviews + prep --------------------------------------------------
  await prisma.interview.create({
    data: {
      applicationId: applications["Summer Analyst — M&A"],
      companyId: companies["Meridian Bank International"],
      roundLabel: "Entretien final — Partners panel",
      scheduledAt: daysFromNow(2),
      durationMinutes: 60,
      format: "ONSITE",
      interviewers: JSON.stringify(["Julien Petit (VP M&A)", "Panel de 3 associés"]),
      notes: "Préparer 2 deals récents à présenter, insister sur la rigueur analytique.",
      status: "SCHEDULED",
    },
  });
  await prisma.interview.create({
    data: {
      applicationId: applications["Summer Intern — Payments Product"],
      companyId: companies["Polaris FinTech"],
      roundLabel: "Entretien manager",
      scheduledAt: daysFromNow(6),
      durationMinutes: 45,
      format: "VIDEO",
      interviewers: JSON.stringify(["Sofia Keller (Talent Lead)"]),
      status: "SCHEDULED",
    },
  });
  await prisma.interview.create({
    data: {
      applicationId: applications["Growth & Ops Intern"],
      companyId: companies["Lumen Digital Ventures"],
      roundLabel: "Entretien final",
      scheduledAt: daysFromNow(-15),
      durationMinutes: 30,
      format: "VIDEO",
      status: "DONE",
      postInterviewNotes: "Très bon feedback, offre reçue une semaine après.",
    },
  });

  const prep1 = await prisma.interviewPrep.create({
    data: {
      applicationId: applications["Summer Analyst — M&A"],
      whyCompany: "Leader M&A en Europe, deal flow varié, culture méritocratique.",
      whyRole: "Exposition directe aux transactions, apprentissage accéléré en modélisation financière.",
      whyCountry: "Londres = hub financier européen, opportunités de networking uniques.",
      relevantExperience: "Stage précédent en corporate finance, projet universitaire de valorisation DCF.",
      questionsToAsk: "Comment se structure l'équipe M&A ? Quel encadrement pour les stagiaires ?",
      weaknessesToPrep: "Peu d'expérience en LBO — réviser les mécaniques clés avant l'entretien.",
    },
  });
  await prisma.question.createMany({
    data: [
      { text: "Pourquoi la banque d'investissement et pas le conseil ?", category: "BEHAVIORAL", status: "MASTERED", interviewPrepId: prep1.id },
      { text: "Racontez un moment où vous avez géré une deadline serrée.", category: "BEHAVIORAL", status: "IN_PROGRESS", interviewPrepId: prep1.id },
      { text: "Expliquez comment fonctionne un LBO.", category: "TECHNICAL", status: "TO_PREPARE", interviewPrepId: prep1.id },
      { text: "Quels sont les 3 méthodes de valorisation d'une entreprise ?", category: "TECHNICAL", status: "MASTERED", interviewPrepId: prep1.id },
      { text: "Quel est le plus grand défi de l'équipe cette année ?", category: "TO_ASK", status: "TO_PREPARE", interviewPrepId: prep1.id },
    ],
  });
  // Reusable question bank (not tied to a specific interview)
  await prisma.question.createMany({
    data: [
      { text: "Parlez-moi de vous.", category: "BEHAVIORAL", status: "MASTERED", isBankItem: true },
      { text: "Quel est votre plus grand échec et qu'en avez-vous retenu ?", category: "BEHAVIORAL", status: "IN_PROGRESS", isBankItem: true },
      { text: "Pourquoi un stage à l'étranger plutôt qu'en France ?", category: "BEHAVIORAL", status: "MASTERED", isBankItem: true },
      { text: "Quelles questions poser en fin d'entretien ?", category: "TO_ASK", status: "TO_PREPARE", isBankItem: true },
    ],
  });

  // 9. Offer ----------------------------------------------------------------
  await prisma.offer.create({
    data: {
      applicationId: applications["Growth & Ops Intern"],
      companyId: companies["Lumen Digital Ventures"],
      countryId: countries["Canada"],
      role: "Growth & Ops Intern",
      city: "Toronto",
      salaryAmount: 3600,
      currency: "CAD",
      bonus: 200,
      housing: false,
      visaSupport: true,
      durationMonths: 3,
      startDate: daysFromNow(250),
      prestige: 3,
      interest: 4,
      learning: 4,
      network: 3,
      careerPotential: 4,
      costOfLivingIndex: 55,
      status: "PENDING",
    },
  });

  // 10. Cover letters ---------------------------------------------------
  await prisma.coverLetter.create({
    data: {
      applicationId: applications["Summer Analyst — M&A"],
      companyId: companies["Meridian Bank International"],
      status: "SENT",
      version: "v3",
      personalizedElements: "Mention du deal récent sur le secteur santé, référence à un ancien stagiaire rencontré au forum.",
      notes: "Relue par 2 alumni avant envoi.",
    },
  });
  await prisma.coverLetter.create({
    data: {
      applicationId: applications["Data Science Intern"],
      companyId: companies["Vertex Analytics"],
      status: "READY",
      version: "v2",
      personalizedElements: "Mise en avant du projet Kaggle personnel.",
    },
  });
  await prisma.coverLetter.create({
    data: {
      applicationId: applications["Automation Engineering Intern"],
      companyId: companies["Ironbridge Engineering"],
      status: "DRAFT",
      version: "v1",
    },
  });

  // 11. Documents (with real placeholder files so downloads work) --------
  const uploadsDir = path.join(process.cwd(), "uploads");
  mkdirSync(uploadsDir, { recursive: true });
  const demoDocs = [
    { name: "CV_Finance_v3", category: "CV", version: "v3", filename: "cv-finance-v3.txt", content: "CV — Finance track (exemple de fichier de démonstration).", applicationTitle: "Summer Analyst — M&A" },
    { name: "CV_Tech_v2", category: "CV", version: "v2", filename: "cv-tech-v2.txt", content: "CV — Tech track (exemple de fichier de démonstration).", applicationTitle: "Data Science Intern" },
    { name: "Cover_Letter_Meridian", category: "COVER_LETTER", version: "v3", filename: "cover-letter-meridian.txt", content: "Lettre de motivation — Meridian Bank International (exemple).", applicationTitle: "Summer Analyst — M&A" },
    { name: "Transcript_L3", category: "TRANSCRIPT", version: "v1", filename: "transcript-l3.txt", content: "Relevé de notes L3 (exemple de fichier de démonstration).", applicationTitle: undefined },
    { name: "Lettre_recommandation_Prof_Fontaine", category: "RECOMMENDATION", version: "v1", filename: "recommandation-fontaine.txt", content: "Lettre de recommandation (exemple).", applicationTitle: undefined },
  ];
  for (const doc of demoDocs) {
    writeFileSync(path.join(uploadsDir, doc.filename), doc.content, "utf-8");
    await prisma.document.create({
      data: {
        name: doc.name,
        category: doc.category,
        version: doc.version,
        filePath: doc.filename,
        fileSize: Buffer.byteLength(doc.content),
        mimeType: "text/plain",
        applicationId: doc.applicationTitle ? applications[doc.applicationTitle] : null,
      },
    });
  }

  // 12. Research items ------------------------------------------------------
  await prisma.researchItem.createMany({
    data: [
      { title: "Classement des meilleurs programmes stage finance Europe 2026", category: "RANKING", url: "https://example.com/ranking-finance", summary: "Classement annuel des programmes summer analyst en Europe.", interestLevel: 4, countryId: countries["Royaume-Uni"] },
      { title: "Guide visa stagiaire Suisse (permis L)", category: "VISA_ADVICE", summary: "Notes personnelles suite à un appel avec un ancien stagiaire à Zurich — à vérifier auprès des autorités.", interestLevel: 5, countryId: countries["Suisse"] },
      { title: "Coût de la vie à Singapour pour un stagiaire", category: "SALARY", summary: "Loyer moyen colocation ~1200 SGD/mois, transport peu cher.", interestLevel: 3, countryId: countries["Singapour"] },
      { title: "Article — Comment décrocher un summer internship en IB", category: "ARTICLE", url: "https://example.com/article-ib", summary: "Conseils sur le networking et la prépa technique.", interestLevel: 4 },
      { title: "Plateforme — eFinancialCareers", category: "PLATFORM", url: "https://example.com/efc", summary: "Bonne source d'offres finance à l'international.", interestLevel: 3 },
      { title: "Ville — vivre à Zurich en tant qu'étudiant étranger", category: "CITY", summary: "Notes de networking + coût de la vie.", interestLevel: 4, countryId: countries["Suisse"] },
      { title: "Programme — Kestrel Aerospace Summer Program", category: "PROGRAM", url: "https://example.com/kestrel-program", summary: "Deadline habituelle en janvier, très sélectif.", interestLevel: 5, companyId: companies["Kestrel Aerospace"] },
      { title: "Contact — Alumni travaillant chez Vertex Analytics", category: "PERSON", summary: "Répond bien sur LinkedIn, a fait le même master.", interestLevel: 4, companyId: companies["Vertex Analytics"] },
    ],
  });

  // 13. Notes -----------------------------------------------------------------
  await prisma.note.create({
    data: {
      title: "Stratégie générale de recherche",
      content: "Prioriser Londres/Zurich/Singapour. Candidater tôt (les summer 2027 recrutent dès l'automne 2026 en finance). Ne pas négliger le networking alumni.",
      pinned: true,
    },
  });
  await prisma.note.create({
    data: { title: "Idée", content: "Relancer le forum carrières de l'école pour identifier plus d'alumni à l'étranger.", pinned: false },
  });

  // 14. Tasks ----------------------------------------------------------------
  const taskDefs = [
    { title: "Relancer Cobalt Trading House", priority: "HIGH", due: 0, status: "TODO", app: "Commodities Trading Intern" },
    { title: "Préparer l'entretien final Meridian Bank", priority: "URGENT", due: 1, status: "TODO", app: "Summer Analyst — M&A" },
    { title: "Finaliser la lettre de motivation Ironbridge", priority: "MEDIUM", due: 2, status: "TODO", app: "Automation Engineering Intern" },
    { title: "Envoyer message LinkedIn à Yuki Tanaka", priority: "MEDIUM", due: -1, status: "TODO", contact: "Yuki Tanaka" },
    { title: "Mettre à jour le CV version Tech", priority: "LOW", due: 5, status: "TODO" },
    { title: "Rechercher 3 nouvelles entreprises à Zurich", priority: "MEDIUM", due: 7, status: "TODO" },
    { title: "Répondre à l'email de Sofia Keller", priority: "HIGH", due: -2, status: "DONE", app: "Summer Intern — Payments Product" },
    { title: "Préparer questions techniques LBO", priority: "HIGH", due: 1, status: "IN_PROGRESS", app: "Summer Analyst — M&A" },
    { title: "Vérifier statut visa Royaume-Uni", priority: "MEDIUM", due: 14, status: "TODO" },
    { title: "Debrief post-entretien Lumen Digital Ventures", priority: "LOW", due: -14, status: "DONE", app: "Growth & Ops Intern" },
  ];
  for (const t of taskDefs) {
    await prisma.task.create({
      data: {
        title: t.title,
        priority: t.priority,
        dueDate: daysFromNow(t.due),
        status: t.status,
        completedAt: t.status === "DONE" ? daysFromNow(t.due) : null,
        applicationId: t.app ? applications[t.app] : null,
        contactId: t.contact ? contacts[t.contact] : null,
        isDemo: true,
      },
    });
  }

  // 15. Calendar events ---------------------------------------------------
  await prisma.event.createMany({
    data: [
      { title: "Entretien final — Meridian Bank", type: "INTERVIEW", date: daysFromNow(2), applicationId: applications["Summer Analyst — M&A"], companyId: companies["Meridian Bank International"], isDemo: true },
      { title: "Entretien manager — Polaris FinTech", type: "INTERVIEW", date: daysFromNow(6), applicationId: applications["Summer Intern — Payments Product"], companyId: companies["Polaris FinTech"], isDemo: true },
      { title: "Deadline — Summer Analyst M&A", type: "DEADLINE", date: daysFromNow(5), applicationId: applications["Summer Analyst — M&A"], isDemo: true },
      { title: "Deadline — Payments Product", type: "DEADLINE", date: daysFromNow(12), applicationId: applications["Summer Intern — Payments Product"], isDemo: true },
      { title: "Forum carrières international", type: "FAIR", date: daysFromNow(9), location: "En ligne", isDemo: true },
      { title: "Call networking — Priya Chandran", type: "NETWORKING_CALL", date: daysFromNow(3), contactId: contacts["Priya Chandran"], isDemo: true },
      { title: "Date limite visa stage Suisse à anticiper", type: "VISA_DEADLINE", date: daysFromNow(45), isDemo: true },
    ],
  });

  // 16. Weekly reviews ------------------------------------------------------
  function mondayOf(offsetWeeks: number) {
    const d = daysFromNow(offsetWeeks * 7);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  await prisma.weeklyReview.create({
    data: {
      weekStart: mondayOf(-1),
      applicationsSent: 3,
      companiesResearched: 4,
      peopleContacted: 5,
      responsesReceived: 2,
      callsHeld: 1,
      interviewsHeld: 1,
      refusals: 1,
      newOpportunities: 4,
      whatWorked: "Le message de relance personnalisé sur LinkedIn a bien fonctionné avec 2 réponses.",
      whatDidntWork: "Trop de candidatures envoyées sans lettre personnalisée → peu de retours.",
      prioritiesNextWeek: "Préparer l'entretien final Meridian, relancer Cobalt, cibler 3 nouvelles entreprises à Zurich.",
    },
  });
  await prisma.weeklyReview.create({
    data: {
      weekStart: mondayOf(-2),
      applicationsSent: 5,
      companiesResearched: 6,
      peopleContacted: 3,
      responsesReceived: 1,
      callsHeld: 0,
      interviewsHeld: 0,
      refusals: 0,
      newOpportunities: 6,
      whatWorked: "Bonne semaine de sourcing, beaucoup de nouvelles pistes identifiées.",
      whatDidntWork: "Pas assez de suivi sur les candidatures déjà envoyées.",
      prioritiesNextWeek: "Systématiser les relances à J+7.",
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
