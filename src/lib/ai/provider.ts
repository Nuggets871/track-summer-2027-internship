import { prisma } from "@/lib/prisma";
import { createDeepSeekProvider } from "@/lib/ai/providers/deepseek";
import type { AiProvider, ChatMessage, AiCallOptions } from "@/lib/ai/types";

async function getDeepSeekKey(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { id: "singleton" } });
  // The DB-stored key (Settings > AI) always wins; DEEPSEEK_API_KEY in .env
  // is only a fallback so existing setups keep working.
  return setting?.deepseekApiKey || process.env.DEEPSEEK_API_KEY || null;
}

const providers: Record<string, AiProvider> = {
  deepseek: createDeepSeekProvider(getDeepSeekKey),
};

/**
 * Resolves the active provider (Setting.aiProvider, "deepseek" today — the
 * registry above is where OpenAI/Anthropic/Gemini would be added later
 * without touching any prompt-building code).
 */
export async function getProvider(): Promise<AiProvider> {
  const setting = await prisma.setting.findUnique({ where: { id: "singleton" } });
  return providers[setting?.aiProvider ?? "deepseek"] ?? providers.deepseek;
}

export async function isAiConfigured(): Promise<boolean> {
  const provider = await getProvider();
  return provider.isConfigured();
}

/** Convenience one-shot call used by every prompt module. Never throws. */
export async function aiChat(messages: ChatMessage[], opts?: AiCallOptions): Promise<string | null> {
  const provider = await getProvider();
  if (!(await provider.isConfigured())) return null;
  return provider.chat(messages, opts);
}

export type { ChatMessage, AiCallOptions };
