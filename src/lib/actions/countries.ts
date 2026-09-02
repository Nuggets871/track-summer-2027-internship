"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const emptyToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

const countrySchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  code: z.preprocess(emptyToNull, z.string().nullable().optional()),
  region: z.preprocess(emptyToNull, z.string().nullable().optional()),
  personalPreference: z.coerce.number().int().min(1).max(5).default(3),
  visaNotes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  costOfLivingNotes: z.preprocess(emptyToNull, z.string().nullable().optional()),
  averageSalaryNote: z.preprocess(emptyToNull, z.string().nullable().optional()),
  usefulLinks: z.preprocess(emptyToNull, z.string().nullable().optional()),
});

export type CountryInput = z.infer<typeof countrySchema>;

function revalidateCountryPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/countries");
  revalidatePath("/map");
}

export async function createCountry(raw: z.infer<typeof countrySchema>) {
  const data = countrySchema.parse(raw);
  const country = await prisma.country.upsert({ where: { name: data.name }, create: data, update: data });
  revalidateCountryPaths();
  return country;
}

export async function updateCountry(id: string, raw: Partial<z.infer<typeof countrySchema>>) {
  const data = countrySchema.partial().parse(raw);
  const country = await prisma.country.update({ where: { id }, data });
  revalidateCountryPaths();
  return country;
}

export async function deleteCountry(id: string) {
  await prisma.country.delete({ where: { id } });
  revalidateCountryPaths();
}

const citySchema = z.object({
  name: z.string().min(1),
  countryId: z.string().min(1),
  lat: z.preprocess(emptyToNull, z.coerce.number().nullable().optional()),
  lng: z.preprocess(emptyToNull, z.coerce.number().nullable().optional()),
});

export async function createCity(raw: z.infer<typeof citySchema>) {
  const data = citySchema.parse(raw);
  const city = await prisma.city.upsert({
    where: { name_countryId: { name: data.name, countryId: data.countryId } },
    create: data,
    update: data,
  });
  revalidateCountryPaths();
  return city;
}

export async function deleteCity(id: string) {
  await prisma.city.delete({ where: { id } });
  revalidateCountryPaths();
}
