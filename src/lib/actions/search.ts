"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { runSearch, type RunSearchOutput } from "@/lib/search/run";
import { setDismissed } from "@/lib/search/store";

const searchInputSchema = z.object({
  keywords: z.string().max(200).optional(),
  countryName: z.string().max(100).nullable().optional(),
  countryCode: z.string().max(5).nullable().optional(),
  remote: z.boolean().optional(),
  providerIds: z.array(z.string().max(40)).max(20).optional(),
  force: z.boolean().optional(),
});

export async function runJobSearch(raw: unknown): Promise<RunSearchOutput> {
  const input = searchInputSchema.parse(raw ?? {});
  return runSearch(input);
}

export async function dismissDiscoveredJob(canonicalUrl: string, dismissed: boolean) {
  await setDismissed(z.string().max(500).parse(canonicalUrl), dismissed);
  revalidatePath("/search");
  return { ok: true };
}

const saveSchema = z.object({
  url: z.string().url(),
  company: z.string().max(200).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
});

export async function addSearchResultToInbox(raw: unknown) {
  const data = saveSchema.parse(raw);
  await prisma.lead.create({
    data: { url: data.url, company: data.company ?? null, role: data.title ?? null, note: "Trouvé via Recherche" },
  });
  revalidatePath("/inbox");
  return { ok: true };
}
