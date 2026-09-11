"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, X, ArrowRight, Link2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { addLeadsFromText, convertLead, discardLead, deleteLead } from "@/lib/actions/leads";
import type { Lead } from "@prisma/client";

export function InboxView({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");

  const add = () => {
    if (!text.trim()) return;
    startTransition(async () => {
      const count = await addLeadsFromText(text);
      setText("");
      toast.success(`${count} piste${count > 1 ? "s" : ""} ajoutée${count > 1 ? "s" : ""}`);
      router.refresh();
    });
  };

  const convert = (id: string) => {
    startTransition(async () => {
      const applicationId = await convertLead(id);
      toast.success("Piste convertie en opportunité");
      router.push(`/opportunities/${applicationId}`);
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coller des pistes</CardTitle>
          <CardDescription>
            Une piste par ligne : une URL, ou « Entreprise — Rôle ». Rien n&apos;est scrapé ici, tu tries plus tard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"https://company.com/jobs/internship\nRevolut — Data analyst\nhttps://jobs.lever.co/startup/12345"}
          />
          <div className="flex justify-end">
            <Button onClick={add} disabled={pending || !text.trim()}>
              <Plus className="size-3.5" /> Ajouter à l&apos;inbox
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            À trier {leads.length > 0 && <span className="text-muted-foreground">({leads.length})</span>}
          </CardTitle>
          <CardDescription>Convertis une piste en opportunité, ou écarte-la.</CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <EmptyState title="Inbox vide" description="Colle des URLs ou des entreprises ci-dessus pour les trier plus tard." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {leads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
                    {lead.url ? <Link2 className="size-4" /> : <Building2 className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {[lead.company, lead.role].filter(Boolean).join(" — ") || lead.url}
                    </p>
                    {lead.url && (
                      <a href={lead.url} target="_blank" rel="noreferrer" className="truncate text-xs text-primary hover:underline">
                        {lead.url}
                      </a>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" onClick={() => convert(lead.id)} disabled={pending}>
                      Convertir <ArrowRight className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => startTransition(async () => { await discardLead(lead.id); router.refresh(); })} disabled={pending} aria-label="Écarter">
                      <X className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => startTransition(async () => { await deleteLead(lead.id); router.refresh(); })} disabled={pending} aria-label="Supprimer">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
