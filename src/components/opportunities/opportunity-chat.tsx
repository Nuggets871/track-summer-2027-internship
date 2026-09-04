"use client";

import { useState, useTransition } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askOpportunityAssistantAction } from "@/lib/actions/ai-actions";
import type { ChatMessage } from "@/lib/ai/types";
import { cn, safeJsonParse } from "@/lib/utils";

export function OpportunityChat({ applicationId, initialHistory, aiConfigured }: { applicationId: string; initialHistory: string | null; aiConfigured: boolean }) {
  const [history, setHistory] = useState<ChatMessage[]>(() => safeJsonParse<ChatMessage[]>(initialHistory, []));
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const send = () => {
    if (!message.trim()) return;
    if (!aiConfigured) { toast.error("Configure une clé IA dans Paramètres > IA."); return; }
    const submitted = message.trim();
    setMessage("");
    setHistory((current) => [...current, { role: "user", content: submitted }]);
    startTransition(async () => {
      try {
        const result = await askOpportunityAssistantAction(applicationId, submitted);
        setHistory(result.history);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible de contacter l'assistant");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Bot className="size-4 text-primary" /> Coach de cette opportunité</CardTitle>
        <CardDescription>Le contexte, la lettre et l’historique restent attachés à cette candidature.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {history.length > 0 && (
          <div className="max-h-80 space-y-2 overflow-y-auto rounded-md bg-surface-muted/35 p-3">
            {history.filter((item) => item.role !== "system").map((item, index) => (
              <div key={`${item.role}-${index}`} className={cn("max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm", item.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-surface text-foreground")}>
                {item.content}
              </div>
            ))}
            {pending && <Loader2 className="size-4 animate-spin text-primary" />}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Quel angle choisir ? Que manque-t-il avant d’envoyer ?" />
          <Button onClick={send} disabled={pending || !message.trim()} aria-label="Envoyer"><Send className="size-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
