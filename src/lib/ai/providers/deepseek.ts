import type { AiProvider, ChatMessage, AiCallOptions } from "@/lib/ai/types";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const REQUEST_TIMEOUT_MS = 20_000;
// Bounds every generation so a prompt can never produce an unbounded reply
// (and an unbounded bill). Callers can raise/lower it per task.
const DEFAULT_MAX_TOKENS = 2_048;

export function createDeepSeekProvider(getApiKey: () => Promise<string | null>): AiProvider {
  async function call(messages: ChatMessage[], opts: AiCallOptions = {}): Promise<string | null> {
    const apiKey = await getApiKey();
    if (!apiKey) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages,
          temperature: opts.temperature ?? 0.3,
          max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
          ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        console.error(`DeepSeek API error: ${res.status} ${res.statusText}`);
        return null;
      }
      const data = await res.json();
      const choice = data?.choices?.[0];
      // A truncated reply is usually invalid JSON; surface it so a too-low
      // max_tokens is diagnosable instead of silently degrading to a fallback.
      if (choice?.finish_reason === "length") {
        console.warn(`DeepSeek response truncated (max_tokens=${opts.maxTokens ?? DEFAULT_MAX_TOKENS}); raise it if content is missing.`);
      }
      return choice?.message?.content ?? null;
    } catch (err) {
      console.error("DeepSeek API call failed:", err instanceof Error ? err.message : err);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    id: "deepseek",
    label: "DeepSeek",
    isConfigured: async () => Boolean(await getApiKey()),
    chat: call,
    async testConnection() {
      const apiKey = await getApiKey();
      if (!apiKey) return { ok: false, message: "Aucune clé configurée." };
      const reply = await call([{ role: "user", content: "Réponds uniquement: ok" }], { temperature: 0 });
      if (reply === null) return { ok: false, message: "Échec de connexion — vérifiez la clé et votre connexion internet." };
      return { ok: true, message: "Connexion réussie." };
    },
  };
}
