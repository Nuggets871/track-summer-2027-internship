"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, X, ArrowRight, Link2, Building2, MapPin, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { convertLead, discardLead, deleteLead } from "@/lib/actions/leads";
import { outreachChannelLabel } from "@/lib/constants";
import type { Lead } from "@prisma/client";

type LeadActions = {
  pending: boolean;
  onConvert: (id: string) => void;
  onDiscard: (id: string) => void;
  onDelete: (id: string) => void;
};

function LeadRowActions({ id, pending, onConvert, onDiscard, onDelete }: LeadActions & { id: string }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button size="sm" onClick={() => onConvert(id)} disabled={pending}>
        Convertir <ArrowRight className="size-3.5" />
      </Button>
      <Button size="icon" variant="ghost" onClick={() => onDiscard(id)} disabled={pending} aria-label="Écarter">
        <X className="size-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={() => onDelete(id)} disabled={pending} aria-label="Supprimer">
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  return <Badge variant={source === "ChatGPT" ? "primary" : "outline"}>{source}</Badge>;
}

export function InboxView({
  advertisedLeads,
  spontaneousLeads,
}: {
  advertisedLeads: Lead[];
  spontaneousLeads: Lead[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const convert = (id: string) => {
    startTransition(async () => {
      const applicationId = await convertLead(id);
      toast.success("Piste convertie en opportunité");
      router.push(`/opportunities/${applicationId}`);
    });
  };

  const discard = (id: string) => {
    startTransition(async () => {
      await discardLead(id);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      await deleteLead(id);
      router.refresh();
    });
  };

  const actions: LeadActions = { pending, onConvert: convert, onDiscard: discard, onDelete: remove };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="size-4 text-muted-foreground" /> Offres
            {advertisedLeads.length > 0 && <span className="text-muted-foreground">({advertisedLeads.length})</span>}
          </CardTitle>
          <CardDescription>Offres publiées (avec lien d&apos;annonce), déposées par ChatGPT via MCP.</CardDescription>
        </CardHeader>
        <CardContent>
          {advertisedLeads.length === 0 ? (
            <EmptyState title="Aucune offre" description="Les offres ajoutées par ChatGPT apparaîtront ici." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {advertisedLeads.map((lead) => (
                <div key={lead.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
                    <Link2 className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {[lead.company, lead.role].filter(Boolean).join(" — ") || lead.url}
                    </p>
                    {(lead.city || lead.country) && (
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {[lead.city, lead.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {lead.description && <p className="line-clamp-2 text-xs text-muted-foreground">{lead.description}</p>}
                    <div className="flex min-w-0 items-center gap-2">
                      <SourceBadge source={lead.source} />
                      {lead.url && (
                        <a href={lead.url} target="_blank" rel="noreferrer" className="truncate text-xs text-primary hover:underline">
                          {lead.url}
                        </a>
                      )}
                    </div>
                  </div>
                  <LeadRowActions id={lead.id} {...actions} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4 text-muted-foreground" /> Candidatures spontanées
            {spontaneousLeads.length > 0 && <span className="text-muted-foreground">({spontaneousLeads.length})</span>}
          </CardTitle>
          <CardDescription>Entreprises ciblées sans offre publiée, avec le canal de contact à privilégier.</CardDescription>
        </CardHeader>
        <CardContent>
          {spontaneousLeads.length === 0 ? (
            <EmptyState title="Aucune candidature spontanée" description="Les cibles ajoutées par ChatGPT apparaîtront ici." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {spontaneousLeads.map((lead) => (
                <div key={lead.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-muted-foreground">
                    <Building2 className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate text-sm font-medium text-foreground">{lead.company || "Entreprise inconnue"}</p>
                    {lead.role && <p className="truncate text-xs text-muted-foreground">Rôle visé : {lead.role}</p>}
                    {(lead.city || lead.country) && (
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {[lead.city, lead.country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {(lead.contactName || lead.contactValue) && (
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <User className="size-3" /> {[lead.contactName, lead.contactValue].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {lead.note && <p className="line-clamp-2 text-xs text-muted-foreground">{lead.note}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                      <SourceBadge source={lead.source} />
                      {lead.channel && <Badge variant="outline">{outreachChannelLabel(lead.channel)}</Badge>}
                    </div>
                  </div>
                  <LeadRowActions id={lead.id} {...actions} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
