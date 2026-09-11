// Provider-agnostic types. Business logic (job extraction, CV parsing,
// cover letters, CV optimization, interview prep) only ever
// talks to these — never to a specific vendor's SDK/HTTP shape — so a new
// provider (OpenAI, Anthropic, Gemini...) is a new file implementing
// `AiProvider`, not a rewrite of every prompt.

export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

export type AiCallOptions = {
  jsonMode?: boolean;
  temperature?: number;
  /** Hard cap on the generated response length, in tokens. */
  maxTokens?: number;
};

export interface AiProvider {
  id: string;
  label: string;
  /** Whether this provider currently has a usable API key. */
  isConfigured(): Promise<boolean>;
  /** Returns the assistant's reply text, or null on any failure (missing
   * key, network error, non-2xx, timeout) — callers must always have a
   * deterministic fallback ready. */
  chat(messages: ChatMessage[], opts?: AiCallOptions): Promise<string | null>;
  /** A cheap round-trip used by Settings > AI > "Test connection". */
  testConnection(): Promise<{ ok: boolean; message: string }>;
}
