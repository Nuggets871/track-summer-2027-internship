"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Send, Bot, User } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { askAssistantAction } from "@/lib/actions/ai-actions";
import type { ChatMessage } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Quelles sont mes 3 meilleures opportunités en ce moment ?",
  "Sur quelles compétences devrais-je me concentrer ?",
  "Ai-je des deadlines qui approchent ?",
];

export function AssistantChat({ aiConfigured }: { aiConfigured: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const question = text.trim();
    if (!question || pending) return;
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    setInput("");
    startTransition(async () => {
      try {
        const reply = await askAssistantAction(next);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erreur de l'assistant");
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden">
      {!aiConfigured && (
        <div className="rounded-md border border-warning/30 bg-warning-soft/40 p-3 text-sm text-foreground">
          Configure une clé DeepSeek dans Paramètres &gt; IA pour activer l&apos;assistant.
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-border p-4">
        {messages.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="Pose ta première question"
            description="L'assistant connaît ton profil, ton CV et tes opportunités enregistrées."
            action={
              <div className="flex flex-wrap justify-center gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => send(s)} disabled={!aiConfigured}>
                    {s}
                  </Button>
                ))}
              </div>
            }
          />
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                {m.role === "user" ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
              </div>
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground",
                )}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {pending && <p className="text-xs text-muted-foreground">L&apos;assistant réfléchit...</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={aiConfigured ? "Écris ta question..." : "Configure d'abord une clé IA dans Paramètres"}
          disabled={!aiConfigured}
          className="min-h-10 flex-1"
        />
        <Button onClick={() => send(input)} disabled={!aiConfigured || pending || !input.trim()}>
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
