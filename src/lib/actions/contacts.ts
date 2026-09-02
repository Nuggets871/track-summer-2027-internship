"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logInteraction } from "@/lib/data/timeline";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const contactSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  companyId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  position: z.preprocess(emptyToNull, z.string().nullable().optional()),
  email: z.preprocess(emptyToNull, z.string().email("Email invalide").nullable().optional()),
  phone: z.preprocess(emptyToNull, z.string().nullable().optional()),
  linkedin: z.preprocess(emptyToNull, z.string().nullable().optional()),
  countryId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  city: z.preprocess(emptyToNull, z.string().nullable().optional()),
  contactType: z.string().default("OTHER"),
  relationshipStrength: z.coerce.number().int().min(1).max(5).default(2),
  firstContactDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  nextFollowUpDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  networkingStage: z.preprocess(emptyToNull, z.string().nullable().optional()),
  linkedinRequestSent: z.boolean().default(false),
  linkedinAccepted: z.boolean().default(false),
  referralObtained: z.boolean().default(false),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type ContactInput = z.infer<typeof contactSchema>;

function revalidateContactPaths(id?: string) {
  revalidatePath("/", "layout");
  revalidatePath("/contacts");
  revalidatePath("/networking");
  if (id) revalidatePath(`/contacts/${id}`);
}

export async function createContact(raw: ContactInput) {
  const data = contactSchema.parse(raw);
  const contact = await prisma.contact.create({ data });
  revalidateContactPaths(contact.id);
  return contact;
}

export async function updateContact(id: string, raw: Partial<ContactInput>) {
  const data = contactSchema.partial().parse(raw);
  const contact = await prisma.contact.update({ where: { id }, data });
  revalidateContactPaths(id);
  return contact;
}

export async function deleteContact(id: string) {
  await prisma.contact.delete({ where: { id } });
  revalidateContactPaths();
}

export async function updateNetworkingStage(id: string, stage: string) {
  const contact = await prisma.contact.update({ where: { id }, data: { networkingStage: stage } });
  revalidateContactPaths(id);
  return contact;
}

export async function linkContactToApplication(contactId: string, applicationId: string) {
  await prisma.application.update({
    where: { id: applicationId },
    data: { contacts: { connect: { id: contactId } } },
  });
  revalidateContactPaths(contactId);
  revalidatePath(`/applications/${applicationId}`);
}

export async function logContactInteraction(
  contactId: string,
  input: { type: string; summary: string; details?: string; date?: string },
) {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  await logInteraction({
    type: input.type,
    summary: input.summary,
    details: input.details,
    contactId,
    companyId: contact.companyId,
    date: input.date ? new Date(input.date) : undefined,
  });
  revalidateContactPaths(contactId);
}
