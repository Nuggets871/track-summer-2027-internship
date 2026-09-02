"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/ai/provider";
import { getOrCreateSettingsRow } from "@/lib/data/settings";

function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 3)}••••••${key.slice(-4)}`;
}

export async function getAiKeyStatus(): Promise<{ configured: boolean; masked: string | null; source: "database" | "env" | "none" }> {
  const setting = await getOrCreateSettingsRow();
  if (setting.deepseekApiKey) return { configured: true, masked: maskKey(setting.deepseekApiKey), source: "database" };
  if (process.env.DEEPSEEK_API_KEY) return { configured: true, masked: maskKey(process.env.DEEPSEEK_API_KEY), source: "env" };
  return { configured: false, masked: null, source: "none" };
}

/** The key is never returned to the client in full — only saved, tested by
 * calling the provider from the server, or deleted. */
export async function saveDeepSeekKey(key: string) {
  const trimmed = key.trim();
  if (!trimmed) throw new Error("Clé vide.");
  await getOrCreateSettingsRow();
  await prisma.setting.update({ where: { id: "singleton" }, data: { deepseekApiKey: trimmed } });
  revalidatePath("/settings");
}

export async function deleteDeepSeekKey() {
  await getOrCreateSettingsRow();
  await prisma.setting.update({ where: { id: "singleton" }, data: { deepseekApiKey: null } });
  revalidatePath("/settings");
}

export async function testAiConnection(): Promise<{ ok: boolean; message: string }> {
  const provider = await getProvider();
  return provider.testConnection();
}
