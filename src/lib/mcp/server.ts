import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { addInternships, listInternships, MAX_INTERNSHIPS_PER_CALL } from "@/lib/internships";
import { addSpontaneousTargets, MAX_SPONTANEOUS_TARGETS_PER_CALL } from "@/lib/spontaneous-targets";
import {
  appendNote,
  buildApplicationPack,
  convertLeadTool,
  discardLeadTool,
  generateCoverLetterTool,
  generateCvTool,
  getCandidateProfile,
  listApplications,
  listPipelineStages,
  markSent,
  setApplicationStatus,
} from "@/lib/mcp/application-tools";

/**
 * MCP server exposed to ChatGPT / coding agents at /mcp. Tools are intentionally
 * thin: all validation, deduplication, persistence and AI work live in the
 * `@/lib` modules, which talk to the same Prisma models as the rest of the app.
 * The database is never exposed directly.
 */

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(prefix: string, error: unknown) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: `${prefix} : ${error instanceof Error ? error.message : "erreur inconnue"}` }],
  };
}

export function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "stage-copilot", version: "1.0.0" });

  // --- Ingestion (Pistes inbox) ------------------------------------------

  server.registerTool(
    "addInternships",
    {
      description:
        "Ajoute une ou plusieurs offres de stage PUBLIÉES (avec URL d'annonce) dans la boîte de réception « Pistes » de Stage Copilot (pas directement dans les opportunités : l'utilisateur les trie ensuite). Pour cibler une entreprise sans offre publiée, utilise plutôt addSpontaneousTargets. Les doublons sont ignorés (même URL normalisée, ou même entreprise + intitulé, déjà en pistes ou en opportunités). Retourne pour chaque offre son statut : created, skipped (déjà présente) ou rejected (champs invalides).",
      inputSchema: z.object({
        internships: z
          .array(
            z.object({
              company: z.string().describe("Nom de l'entreprise (obligatoire)"),
              title: z.string().describe("Intitulé du stage (obligatoire)"),
              url: z.string().describe("URL de l'offre, http ou https (obligatoire)"),
              country: z.string().optional().describe("Pays"),
              city: z.string().optional().describe("Ville"),
              description: z.string().optional().describe("Description de l'offre"),
              source: z.string().optional().describe("Source de l'offre, ex. LinkedIn"),
            }),
          )
          .min(1)
          .max(MAX_INTERNSHIPS_PER_CALL)
          .describe(`Offres à ajouter (maximum ${MAX_INTERNSHIPS_PER_CALL})`),
      }),
    },
    async ({ internships }) => {
      try {
        return textResult({ results: await addInternships(internships) });
      } catch (error) {
        return errorResult("Ajout impossible", error);
      }
    },
  );

  server.registerTool(
    "addSpontaneousTargets",
    {
      description:
        "Ajoute une ou plusieurs candidatures spontanées ciblées dans la boîte de réception « Pistes » de Stage Copilot : des entreprises à contacter sans offre publiée. Chaque cible précise le rôle ou domaine visé, le canal de contact et, si connu, un contact. Les doublons sont ignorés (même entreprise + rôle visé, déjà en pistes ou en opportunités). Retourne pour chaque cible son statut : created, skipped (déjà présente) ou rejected (champs invalides).",
      inputSchema: z.object({
        targets: z
          .array(
            z.object({
              company: z.string().describe("Nom de l'entreprise ciblée (obligatoire)"),
              targetRole: z.string().describe("Rôle ou domaine visé (obligatoire), ex. Data analyst"),
              country: z.string().optional().describe("Pays"),
              city: z.string().optional().describe("Ville"),
              channel: z
                .enum(["EMAIL", "LINKEDIN", "WEBSITE", "CONTACT", "OTHER"])
                .optional()
                .describe("Canal de prise de contact privilégié"),
              contactName: z.string().optional().describe("Personne à contacter, si connue"),
              contactValue: z.string().optional().describe("E-mail, profil ou URL de formulaire du contact"),
              notes: z.string().optional().describe("Angle, recherche entreprise ou note utile"),
              source: z.string().optional().describe("Origine de la cible, ex. ChatGPT"),
            }),
          )
          .min(1)
          .max(MAX_SPONTANEOUS_TARGETS_PER_CALL)
          .describe(`Candidatures spontanées à ajouter (maximum ${MAX_SPONTANEOUS_TARGETS_PER_CALL})`),
      }),
    },
    async ({ targets }) => {
      try {
        return textResult({ results: await addSpontaneousTargets(targets) });
      } catch (error) {
        return errorResult("Ajout impossible", error);
      }
    },
  );

  server.registerTool(
    "listInternships",
    {
      description:
        "Liste ce qui existe déjà dans Stage Copilot : les offres et cibles en attente de tri (location « inbox », avec leur kind ADVERTISED ou SPONTANEOUS) et les opportunités déjà suivies (location « opportunities »), les plus récentes d'abord. À utiliser pour vérifier les doublons avant d'ajouter. Chaque entrée précise sa location, son statut et son kind.",
      inputSchema: z.object({
        query: z.string().optional().describe("Filtre texte sur le nom de l'entreprise ou l'intitulé du poste"),
        status: z.string().optional().describe("Filtre sur le statut, ex. Sauvegardée, En préparation, Envoyée"),
        kind: z.enum(["ADVERTISED", "SPONTANEOUS"]).optional().describe("Filtre sur le type : ADVERTISED (offres publiées) ou SPONTANEOUS (candidatures spontanées)"),
        limit: z.number().int().min(1).max(200).optional().describe("Nombre maximum de résultats (défaut 50)"),
      }),
    },
    async ({ query, status, kind, limit }) => {
      try {
        const internships = await listInternships({ query, status, kind, limit });
        return textResult({ count: internships.length, internships });
      } catch (error) {
        return errorResult("Lecture impossible", error);
      }
    },
  );

  // --- Opportunities (driving the application workflow) ------------------

  server.registerTool(
    "listApplications",
    {
      description:
        "Liste les opportunités SUIVIES (pas les pistes) avec les champs utiles pour choisir sur quoi travailler : statut stable (statusKey, ex. SAVED/APPLIED), entreprise, poste, URL de l'offre, type (ADVERTISED/SPONTANEOUS), matchScore, deadline, prochaine action, et présence d'une lettre / d'un CV généré. Filtres insensibles à la casse.",
      inputSchema: z.object({
        query: z.string().optional().describe("Filtre texte sur l'entreprise ou l'intitulé"),
        status: z.string().optional().describe("Filtre sur le statut, par clé (SAVED, APPLIED…) ou libellé (Sauvegardée, Envoyée…)"),
        hasCoverLetter: z.boolean().optional().describe("Ne garder que celles avec (true) ou sans (false) lettre de motivation"),
        hasCv: z.boolean().optional().describe("Ne garder que celles avec (true) ou sans (false) CV généré"),
        limit: z.number().int().min(1).max(200).optional().describe("Nombre maximum de résultats (défaut 50)"),
      }),
    },
    async ({ query, status, hasCoverLetter, hasCv, limit }) => {
      try {
        const applications = await listApplications({ query, status, hasCoverLetter, hasCv, limit });
        return textResult({ count: applications.length, applications });
      } catch (error) {
        return errorResult("Lecture impossible", error);
      }
    },
  );

  server.registerTool(
    "getApplicationPack",
    {
      description:
        "Renvoie TOUT le nécessaire pour traiter une candidature : l'opportunité (poste, URL, statut, dates, notes), l'analyse de l'offre (matchScore, compétences requises, description), le bloc candidat prêt à remplir un formulaire (nom, email, téléphone, liens, formation, langues, disponibilité, autorisation de travail), et les chemins de téléchargement du CV personnalisé et de la lettre (/api/cv/<id>/pdf, /api/cover-letter/<id>/pdf). À utiliser avant de postuler sur un site externe.",
      inputSchema: z.object({
        applicationId: z.string().describe("Identifiant de l'opportunité (id d'une entrée de listApplications)"),
      }),
    },
    async ({ applicationId }) => {
      try {
        return textResult(await buildApplicationPack(applicationId));
      } catch (error) {
        return errorResult("Lecture impossible", error);
      }
    },
  );

  server.registerTool(
    "listPipelineStages",
    {
      description:
        "Liste les statuts valides du pipeline (clé + libellé), pour choisir une valeur acceptée par setApplicationStatus.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return textResult({ stages: await listPipelineStages() });
      } catch (error) {
        return errorResult("Lecture impossible", error);
      }
    },
  );

  server.registerTool(
    "setApplicationStatus",
    {
      description:
        "Déplace une opportunité vers un autre statut du pipeline, par clé (SAVED, PREPARING, APPLIED, INTERVIEW, OFFER, REJECTED, ARCHIVED) ou par libellé français (Sauvegardée, En préparation, Envoyée, Entretien, Offre, Refusée, Archivée). Passe par la même logique que l'interface (journal d'activité inclus).",
      inputSchema: z.object({
        applicationId: z.string().describe("Identifiant de l'opportunité"),
        status: z.string().describe("Statut cible, par clé ou libellé (ex. APPLIED ou Envoyée)"),
      }),
    },
    async ({ applicationId, status }) => {
      try {
        return textResult(await setApplicationStatus(applicationId, status));
      } catch (error) {
        return errorResult("Changement de statut impossible", error);
      }
    },
  );

  server.registerTool(
    "markApplicationSent",
    {
      description:
        "Marque une opportunité comme « Envoyée » : enregistre la date d'envoi, planifie la relance automatique selon le réglage followUpRuleDays et remonte l'événement dans la timeline — le même parcours que le bouton de l'interface.",
      inputSchema: z.object({
        applicationId: z.string().describe("Identifiant de l'opportunité"),
      }),
    },
    async ({ applicationId }) => {
      try {
        return textResult(await markSent(applicationId));
      } catch (error) {
        return errorResult("Marquage impossible", error);
      }
    },
  );

  server.registerTool(
    "appendApplicationNote",
    {
      description:
        "Ajoute une note horodatée aux notes libres d'une opportunité et, si fournis, met à jour la prochaine action et sa date. Utile pour consigner ce qui a été fait (ex. « candidature envoyée via Ashby, captcha résolu »).",
      inputSchema: z.object({
        applicationId: z.string().describe("Identifiant de l'opportunité"),
        note: z.string().describe("Texte de la note à ajouter"),
        nextAction: z.string().optional().describe("Nouvelle prochaine action (optionnel)"),
        nextActionDate: z.string().optional().describe("Date de la prochaine action, ISO 8601 (optionnel)"),
      }),
    },
    async ({ applicationId, note, nextAction, nextActionDate }) => {
      try {
        return textResult(await appendNote(applicationId, { note, nextAction, nextActionDate }));
      } catch (error) {
        return errorResult("Ajout impossible", error);
      }
    },
  );

  server.registerTool(
    "generateCoverLetter",
    {
      description:
        "Génère (ou régénère) la lettre de motivation d'une opportunité avec l'IA de l'app, à partir du profil, de l'offre et de la lettre de référence. Renvoie le contenu et les liens d'export PDF/DOCX. tone : PROFESSIONAL (défaut), NATURAL, CONCISE, PERSONALIZED. language : FR ou EN.",
      inputSchema: z.object({
        applicationId: z.string().describe("Identifiant de l'opportunité"),
        tone: z.enum(["PROFESSIONAL", "NATURAL", "CONCISE", "PERSONALIZED"]).optional().describe("Ton de la lettre (défaut PROFESSIONAL)"),
        language: z.enum(["FR", "EN"]).optional().describe("Langue de la lettre (défaut FR)"),
      }),
    },
    async ({ applicationId, tone, language }) => {
      try {
        return textResult(await generateCoverLetterTool(applicationId, tone ?? "PROFESSIONAL", language ?? "FR"));
      } catch (error) {
        return errorResult("Génération impossible", error);
      }
    },
  );

  server.registerTool(
    "generateCv",
    {
      description:
        "Génère (ou régénère) le CV personnalisé pour une opportunité avec l'IA de l'app, à partir du profil et de l'offre, puis le trie pour tenir sur une page. Renvoie les liens d'export PDF/DOCX. language : FR ou EN.",
      inputSchema: z.object({
        applicationId: z.string().describe("Identifiant de l'opportunité"),
        language: z.enum(["FR", "EN"]).optional().describe("Langue du CV (défaut FR)"),
      }),
    },
    async ({ applicationId, language }) => {
      try {
        return textResult(await generateCvTool(applicationId, language ?? "FR"));
      } catch (error) {
        return errorResult("Génération impossible", error);
      }
    },
  );

  server.registerTool(
    "getCandidateProfile",
    {
      description:
        "Renvoie le profil candidat tel qu'un formulaire externe en a besoin : identité, contact, liens (LinkedIn/GitHub/portfolio), formation, expériences, compétences, langues, disponibilité et autorisation de travail. Ne contient jamais la lettre de référence ni le texte brut du CV.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        return textResult(await getCandidateProfile());
      } catch (error) {
        return errorResult("Lecture impossible", error);
      }
    },
  );

  // --- Pistes triage -----------------------------------------------------

  server.registerTool(
    "convertLead",
    {
      description:
        "Convertit une piste de la boîte « Pistes » en opportunité suivie (statut Sauvegardée) et renvoie l'identifiant de la nouvelle opportunité. Les offres publiées conservent leur URL ; les cibles spontanées deviennent un prospect avec leur canal de contact.",
      inputSchema: z.object({
        leadId: z.string().describe("Identifiant de la piste (id d'une entrée location=inbox de listInternships)"),
      }),
    },
    async ({ leadId }) => {
      try {
        return textResult(await convertLeadTool(leadId));
      } catch (error) {
        return errorResult("Conversion impossible", error);
      }
    },
  );

  server.registerTool(
    "discardLead",
    {
      description: "Écarte une piste de la boîte « Pistes » sans la convertir en opportunité.",
      inputSchema: z.object({
        leadId: z.string().describe("Identifiant de la piste"),
      }),
    },
    async ({ leadId }) => {
      try {
        return textResult(await discardLeadTool(leadId));
      } catch (error) {
        return errorResult("Suppression impossible", error);
      }
    },
  );

  return server;
}
