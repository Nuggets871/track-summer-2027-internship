// Robust JSON handling for AI replies. Even with `response_format:
// json_object`, models occasionally wrap the payload in Markdown fences or
// add a sentence around it, and a truncated response (max_tokens reached) is
// invalid JSON. `aiJson` parses leniently and retries once, so a single
// formatting slip no longer silently discards an otherwise good extraction.

import { aiChat } from "@/lib/ai/provider";
import type { ChatMessage, AiCallOptions } from "@/lib/ai/provider";

/**
 * Extracts the first valid JSON object/array from a model reply, tolerating
 * ```json fences and surrounding prose. Returns null when nothing parses.
 */
export function parseJsonLoose(raw: string | null): unknown {
  if (!raw) return null;
  let text = raw.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    // fall through to balanced extraction
  }

  const start = text.search(/[{[]/);
  if (start === -1) return null;
  const open = text[start];
  const close = open === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * `jsonMode` chat that returns the parsed payload, or null. When the first
 * reply isn't valid JSON, it asks once more (echoing the bad output back) at
 * temperature 0. Never throws.
 */
export async function aiJson(messages: ChatMessage[], opts: AiCallOptions = {}): Promise<unknown | null> {
  const merged: AiCallOptions = { ...opts, jsonMode: true };

  const first = await aiChat(messages, merged);
  const parsed = parseJsonLoose(first);
  if (parsed !== null) return parsed;
  if (!first) return null;

  const retry = await aiChat(
    [
      ...messages,
      { role: "assistant", content: first },
      {
        role: "user",
        content:
          "Ta réponse précédente n'était pas un objet JSON valide. Renvoie uniquement l'objet JSON demandé, sans aucun texte ni balise Markdown autour.",
      },
    ],
    { ...merged, temperature: 0 },
  );
  return parseJsonLoose(retry);
}
