"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createSpontaneousApplication } from "@/lib/actions/applications";

export function SpontaneousApplicationForm({ onDone }: { onDone?: (applicationId: string) => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [companyName, setCompanyName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [channel, setChannel] = useState<"EMAIL" | "LINKEDIN" | "WEBSITE" | "CONTACT" | "OTHER">("EMAIL");
  const [recipientName, setRecipientName] = useState("");
  const [recipientValue, setRecipientValue] = useState("");
  const [companyResearch, setCompanyResearch] = useState("");
  const [availability, setAvailability] = useState("");
  const [notes, setNotes] = useState("");

  const submit = (action: "PREPARE" | "ALREADY_APPLIED") => {
    if (!companyName.trim() || !targetRole.trim()) {
      toast.error("Indique au minimum l'entreprise et le rôle ou domaine visé.");
      return;
    }
    startTransition(async () => {
      try {
        const application = await createSpontaneousApplication({
          companyName, targetRole, channel, recipientName, recipientValue,
          companyResearch, availability, notes, action,
        });
        toast.success(action === "PREPARE" ? "Candidature spontanée prête à travailler" : "Prise de contact enregistrée");
        onDone?.(application.id);
        router.push(`/opportunities/${application.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer cette candidature");
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Ici, pas de faux score de compatibilité : prépare un angle de contact précis à partir de l’entreprise, du rôle visé et de ton expérience.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sp-company">Entreprise *</Label>
          <Input id="sp-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} autoFocus />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sp-role">Rôle ou domaine visé *</Label>
          <Input id="sp-role" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Software engineer, plateforme, data…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Canal</Label>
          <Select value={channel} onValueChange={(value) => setChannel(value as typeof channel)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EMAIL">E-mail</SelectItem>
              <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
              <SelectItem value="WEBSITE">Site / formulaire</SelectItem>
              <SelectItem value="CONTACT">Contact personnel / événement</SelectItem>
              <SelectItem value="OTHER">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sp-recipient">Destinataire (optionnel)</Label>
          <Input id="sp-recipient" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Nom et fonction" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sp-value">Adresse e-mail ou lien (optionnel)</Label>
          <Input id="sp-value" value={recipientValue} onChange={(e) => setRecipientValue(e.target.value)} placeholder="recrutement@entreprise.fr ou URL LinkedIn" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="sp-research">Pourquoi cette entreprise ?</Label>
          <Textarea id="sp-research" rows={4} value={companyResearch} onChange={(e) => setCompanyResearch(e.target.value)} placeholder="Produit, équipe, actualité ou problème concret auquel tu peux contribuer…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sp-availability">Disponibilité</Label>
          <Input id="sp-availability" value={availability} onChange={(e) => setAvailability(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sp-notes">Notes</Label>
          <Input id="sp-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button variant="secondary" onClick={() => submit("ALREADY_APPLIED")} disabled={pending}>Déjà contacté</Button>
        <Button onClick={() => submit("PREPARE")} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Préparer
        </Button>
      </div>
    </div>
  );
}
