"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureApplicationPipelineStages } from "@/lib/data/pipeline-stages";
import { logActivity } from "@/lib/data/activity";

export async function discardLead(id: string) {
  await prisma.lead.update({ where: { id }, data: { status: "DISCARDED" } });
  revalidatePath("/inbox");
}

export async function deleteLead(id: string) {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/inbox");
}

/** Turns a staged lead into a real opportunity the user can open. Advertised
 * offers keep their posting URL; spontaneous targets become a prospect with
 * the outreach channel and contact carried over. */
export async function convertLead(leadId: string) {
  const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
  const stages = await ensureApplicationPipelineStages();
  const savedStage = stages.find((stage) => stage.key === "SAVED");
  if (!savedStage) throw new Error('Statut "Sauvegardée" introuvable.');

  const spontaneous = lead.kind === "SPONTANEOUS";

  const companyName =
    lead.company?.trim() ||
    (lead.url ? new URL(lead.url).hostname.replace(/^www\./, "") : "Entreprise inconnue");

  const company =
    (await prisma.company.findFirst({ where: { name: companyName } })) ??
    (await prisma.company.create({ data: { name: companyName } }));

  let countryId: string | undefined;
  const countryName = lead.country?.trim();
  if (countryName) {
    const country = await prisma.country.upsert({
      where: { name: countryName },
      create: { name: countryName },
      update: {},
    });
    countryId = country.id;
  }

  let cityId: string | undefined;
  const cityName = lead.city?.trim();
  if (cityName && countryId) {
    const city = await prisma.city.upsert({
      where: { name_countryId: { name: cityName, countryId } },
      create: { name: cityName, countryId },
      update: {},
    });
    cityId = city.id;
  }

  const application = await prisma.application.create({
    data: {
      title: lead.role?.trim() || (spontaneous ? "Candidature spontanée" : "À qualifier"),
      companyId: company.id,
      countryId,
      cityId,
      jobUrl: lead.url,
      applicationType: spontaneous ? "SPONTANEOUS" : "ADVERTISED",
      targetRole: spontaneous ? lead.role?.trim() || null : null,
      outreachChannel: spontaneous ? lead.channel : null,
      recipientName: spontaneous ? lead.contactName : null,
      recipientValue: spontaneous ? lead.contactValue : null,
      source: spontaneous ? "Candidature spontanée" : lead.source ?? "Piste",
      statusId: savedStage.id,
      discoveredAt: new Date(),
      notes: lead.description ?? lead.note,
      nextAction: spontaneous ? "Préparer le message de prise de contact" : "Analyser l'offre",
    },
  });

  await prisma.lead.update({ where: { id: leadId }, data: { status: "CONVERTED" } });
  await logActivity(application.id, "CREATED", spontaneous ? "Opportunité créée depuis une piste spontanée" : "Opportunité créée depuis une piste");

  revalidatePath("/inbox");
  revalidatePath("/opportunities");
  return application.id;
}
