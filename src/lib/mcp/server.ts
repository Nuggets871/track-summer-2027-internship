import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { addInternships, listInternships, MAX_INTERNSHIPS_PER_CALL } from "@/lib/internships";
import { addSpontaneousTargets, MAX_SPONTANEOUS_TARGETS_PER_CALL } from "@/lib/spontaneous-targets";

/**
 * MCP server exposed to ChatGPT at /mcp. Tools are intentionally thin: all
 * validation, deduplication and persistence live in `@/lib/internships`, which
 * talks to the same Prisma models as the rest of the app. The database is
 * never exposed directly.
 */
export function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "stage-copilot", version: "1.0.0" });

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
        const results = await addInternships(internships);
        return { content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Ajout impossible : ${error instanceof Error ? error.message : "erreur inconnue"}` }],
        };
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
        return { content: [{ type: "text", text: JSON.stringify({ count: internships.length, internships }, null, 2) }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Lecture impossible : ${error instanceof Error ? error.message : "erreur inconnue"}` }],
        };
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
        const results = await addSpontaneousTargets(targets);
        return { content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Ajout impossible : ${error instanceof Error ? error.message : "erreur inconnue"}` }],
        };
      }
    },
  );

  return server;
}
