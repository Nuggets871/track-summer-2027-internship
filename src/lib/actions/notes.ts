"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const noteSchema = z.object({
  title: z.preprocess(emptyToNull, z.string().nullable().optional()),
  content: z.string().min(1, "Le contenu est requis"),
  pinned: z.boolean().default(false),
  applicationId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  companyId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  contactId: z.preprocess(emptyToNull, z.string().nullable().optional()),
  countryId: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type NoteInput = z.infer<typeof noteSchema>;

function revalidateNotePaths(input?: Partial<z.infer<typeof noteSchema>>) {
  revalidatePath("/", "layout");
  if (input?.applicationId) revalidatePath(`/applications/${input.applicationId}`);
  if (input?.companyId) revalidatePath(`/companies/${input.companyId}`);
  if (input?.contactId) revalidatePath(`/contacts/${input.contactId}`);
}

export async function createNote(raw: z.infer<typeof noteSchema>) {
  const data = noteSchema.parse(raw);
  const note = await prisma.note.create({ data });
  revalidateNotePaths(data);
  return note;
}

export async function updateNote(id: string, raw: Partial<z.infer<typeof noteSchema>>) {
  const data = noteSchema.partial().parse(raw);
  const note = await prisma.note.update({ where: { id }, data });
  revalidateNotePaths(note);
  return note;
}

export async function togglePinNote(id: string) {
  const note = await prisma.note.findUniqueOrThrow({ where: { id } });
  const updated = await prisma.note.update({ where: { id }, data: { pinned: !note.pinned } });
  revalidateNotePaths(updated);
  return updated;
}

export async function deleteNote(id: string) {
  const note = await prisma.note.delete({ where: { id } });
  revalidateNotePaths(note);
}
