import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { addInternships, listInternships, MAX_INTERNSHIPS_PER_CALL } from "@/lib/internships";

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
        "Ajoute une ou plusieurs offres de stage dans la boîte de réception « Pistes » de Stage Copilot (pas directement dans les opportunités : l'utilisateur les trie ensuite). Les doublons sont ignorés (même URL normalisée, ou même entreprise + intitulé, déjà en pistes ou en opportunités). Retourne pour chaque offre son statut : created, skipped (déjà présente) ou rejected (champs invalides).",
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
        "Liste les offres déjà présentes dans la boîte de réception « Pistes » de Stage Copilot, les plus récentes d'abord, avec leur statut (À trier, Convertie, Écartée). À utiliser pour vérifier ce qui existe déjà avant d'en ajouter de nouvelles. Les opportunités déjà converties y figurent aussi, marquées « Convertie ».",
      inputSchema: z.object({
        query: z.string().optional().describe("Filtre texte sur le nom de l'entreprise ou l'intitulé du poste"),
        status: z.string().optional().describe("Filtre sur le statut, ex. Sauvegardée, En préparation, Envoyée"),
        limit: z.number().int().min(1).max(200).optional().describe("Nombre maximum de résultats (défaut 50)"),
      }),
    },
    async ({ query, status, limit }) => {
      try {
        const internships = await listInternships({ query, status, limit });
        return { content: [{ type: "text", text: JSON.stringify({ count: internships.length, internships }, null, 2) }] };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Lecture impossible : ${error instanceof Error ? error.message : "erreur inconnue"}` }],
        };
      }
    },
  );

  return server;
}
