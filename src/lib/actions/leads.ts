"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureApplicationPipelineStages } from "@/lib/data/pipeline-stages";
import { logActivity } from "@/lib/data/activity";

/** Parses a pasted blob (one lead per line) into rows. A line may be a plain
 * URL, "Company — Role", or "URL Company". Nothing is scraped here: it's a
 * staging inbox the user triages later. */
export async function addLeadsFromText(rawText: string) {
  const text = z.string().trim().min(1).max(50_000).parse(rawText);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 200);

  let created = 0;
  for (const line of lines) {
    const urlMatch = line.match(/https?:\/\/\S+/i);
    const url = urlMatch?.[0] ?? null;
    let company: string | null = null;
    let role: string | null = null;

    if (url) {
      const rest = line.replace(url, " ").replace(/[-–—|·,]+/g, " ").trim();
      company = rest ? rest.slice(0, 140) : null;
    } else {
      const parts = line.split(/\s[-–—|]\s/);
      company = parts[0]?.trim().slice(0, 140) || null;
      role = parts[1]?.trim().slice(0, 140) || null;
    }
    if (!url && !company) continue;
    await prisma.lead.create({ data: { url, company, role } });
    created += 1;
  }

  revalidatePath("/inbox");
  return created;
}

export async function discardLead(id: string) {
  await prisma.lead.update({ where: { id }, data: { status: "DISCARDED" } });
  revalidatePath("/inbox");
}

export async function deleteLead(id: string) {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/inbox");
}

/** Turns a lead into a real (unsaved-analysis) opportunity the user can open. */
export async function convertLead(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const stages = await ensureApplicationPipelineStages();
  const savedStage = stages.find((stage) => stage.key === "SAVED");
  if (!savedStage) throw new Error('Statut "Sauvegardée" introuvable.');

  const companyName =
    lead.company?.trim() ||
    (lead.url ? new URL(lead.url).hostname.replace(/^www\./, "") : "Entreprise inconnue");

  const company =
    (await prisma.company.findFirst({ where: { name: companyName } })) ??
    (await prisma.company.create({ data: { name: companyName } }));

  const application = await prisma.application.create({
    data: {
      title: lead.role?.trim() || "À qualifier",
      companyId: company.id,
      jobUrl: lead.url,
      source: "Piste",
      statusId: savedStage.id,
      discoveredAt: new Date(),
      notes: lead.note,
      nextAction: lead.url ? "Analyser l'offre" : "Qualifier la piste",
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "CONVERTED" } });
  await logActivity(application.id, "CREATED", "Opportunité créée depuis une piste");

  revalidatePath("/inbox");
  revalidatePath("/opportunities");
  return application.id;
}
