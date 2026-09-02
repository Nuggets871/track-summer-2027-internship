"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const eventSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  type: z.string().default("OTHER"),
  date: z.coerce.date(),
  endDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  allDay: z.boolean().default(true),
  location: z.preprocess(emptyToNull, z.string().nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  applicationId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  contactId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  companyId: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type EventInput = z.infer<typeof eventSchema>;

function revalidateEventPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/calendar");
  revalidatePath("/today");
}

export async function createEvent(raw: EventInput) {
  const data = eventSchema.parse(raw);
  const event = await prisma.event.create({ data });
  revalidateEventPaths();
  return event;
}

export async function updateEvent(id: string, raw: Partial<EventInput>) {
  const data = eventSchema.partial().parse(raw);
  const event = await prisma.event.update({ where: { id }, data });
  revalidateEventPaths();
  return event;
}

export async function deleteEvent(id: string) {
  await prisma.event.delete({ where: { id } });
  revalidateEventPaths();
}
