import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { OUTREACH_CHANNELS } from "@/lib/constants";
import { duplicateKey, logMcpActivity } from "@/lib/internships";

/**
 * Ingestion of spontaneous application targets (used by the MCP server for
 * ChatGPT). A target is a company to reach out to without a published offer:
 * it carries a targeted role, an outreach channel and an optional contact,
 * then lands in the "Pistes" inbox next to the advertised offers — in its own
 * section, with its own fields.
 */

export type SpontaneousTargetInput = {
  company?: string | null;
  targetRole?: string | null;
  country?: string | null;
  city?: string | null;
  channel?: string | null;
  contactName?: string | null;
  contactValue?: string | null;
  notes?: string | null;
  source?: string | null;
};

export type SpontaneousTargetStatus = "created" | "skipped" | "rejected";

export type SpontaneousTargetResult = {
  status: SpontaneousTargetStatus;
  id: string | null;
  company: string;
  targetRole: string;
  reason?: string;
};

export const MAX_SPONTANEOUS_TARGETS_PER_CALL = 50;

const CHANNEL_VALUES = new Set<string>(OUTREACH_CHANNELS.map((channel) => channel.value));

type ValidatedTarget = {
  company: string;
  targetRole: string;
  country: string | null;
  city: string | null;
  channel: string | null;
  contactName: string | null;
  contactValue: string | null;
  notes: string | null;
  source: string | null;
};

function validateTarget(
  input: SpontaneousTargetInput,
): { ok: true; value: ValidatedTarget } | { ok: false; company: string; targetRole: string; reason: string } {
  const company = (input.company ?? "").trim();
  const targetRole = (input.targetRole ?? "").trim();
  const channel = (input.channel ?? "").trim().toUpperCase();

  if (!company) return { ok: false, company, targetRole, reason: "Entreprise manquante" };
  if (!targetRole) return { ok: false, company, targetRole, reason: "Rôle visé manquant" };
  if (channel && !CHANNEL_VALUES.has(channel)) {
    return { ok: false, company, targetRole, reason: "Canal de contact invalide" };
  }

  return {
    ok: true,
    value: {
      company,
      targetRole,
      country: input.country?.trim() || null,
      city: input.city?.trim() || null,
      channel: channel || null,
      contactName: input.contactName?.trim() || null,
      contactValue: input.contactValue?.trim() || null,
      notes: input.notes?.trim() || null,
      source: input.source?.trim() || null,
    },
  };
}

/**
 * Stages spontaneous targets in the "Pistes" inbox. Like `addInternships`,
 * every input yields a `created`, `skipped` (already a target or already
 * tracked as an opportunity) or `rejected` (invalid fields) result.
 */
export async function addSpontaneousTargets(items: SpontaneousTargetInput[]): Promise<SpontaneousTargetResult[]> {
  const batch = items.slice(0, MAX_SPONTANEOUS_TARGETS_PER_CALL);

  const [leads, applications] = await Promise.all([
    prisma.lead.findMany({
      where: { kind: "SPONTANEOUS" },
      select: { id: true, company: true, role: true },
    }),
    prisma.application.findMany({
      where: { deletedAt: null },
      select: { id: true, title: true, company: { select: { name: true } } },
    }),
  ]);

  const idByCompanyRole = new Map<string, string>();
  for (const lead of leads) {
    if (lead.company && lead.role) idByCompanyRole.set(duplicateKey(lead.company, lead.role), lead.id);
  }
  for (const application of applications) {
    idByCompanyRole.set(duplicateKey(application.company.name, application.title), application.id);
  }

  const seenThisBatch = new Set<string>();
  const results: SpontaneousTargetResult[] = [];

  for (const input of batch) {
    const validated = validateTarget(input);
    if (!validated.ok) {
      results.push({ status: "rejected", id: null, company: validated.company, targetRole: validated.targetRole, reason: validated.reason });
      continue;
    }

    const { company, targetRole, country, city, channel, contactName, contactValue, notes, source } = validated.value;
    const companyRoleKey = duplicateKey(company, targetRole);

    if (seenThisBatch.has(companyRoleKey)) {
      results.push({ status: "skipped", id: null, company, targetRole, reason: "Doublon dans la même requête" });
      continue;
    }

    const duplicateId = idByCompanyRole.get(companyRoleKey);
    if (duplicateId) {
      seenThisBatch.add(companyRoleKey);
      results.push({ status: "skipped", id: duplicateId, company, targetRole, reason: "Candidature spontanée déjà enregistrée (pistes ou opportunités)" });
      continue;
    }

    const lead = await prisma.lead.create({
      data: {
        kind: "SPONTANEOUS",
        company,
        role: targetRole,
        country,
        city,
        channel,
        contactName,
        contactValue,
        note: notes,
        source: source ?? "ChatGPT",
        status: "NEW",
      },
    });

    idByCompanyRole.set(companyRoleKey, lead.id);
    seenThisBatch.add(companyRoleKey);

    results.push({ status: "created", id: lead.id, company, targetRole });
  }

  await logMcpActivity("addSpontaneousTargets", {
    created: results.filter((result) => result.status === "created").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    rejected: results.filter((result) => result.status === "rejected").length,
    detail: JSON.stringify(results).slice(0, 8000),
  });

  revalidatePath("/inbox");
  return results;
}
