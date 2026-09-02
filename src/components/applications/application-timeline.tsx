"use client";

import { useState, useTransition } from "react";
import { Plus, Mail, Link2, Phone, Users, Calendar, Award, Clock, RefreshCw, MessagesSquare, FileEdit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { logApplicationInteraction } from "@/lib/actions/applications";
import { INTERACTION_TYPES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { Interaction } from "@prisma/client";

const ICONS: Record<string, typeof Mail> = {
  EMAIL: Mail,
  LINKEDIN: Link2,
  CALL: Phone,
  MEETING: Users,
  EVENT: Calendar,
  RECOMMENDATION: Award,
  STATUS_CHANGE: RefreshCw,
  INTERVIEW: MessagesSquare,
  NOTE: FileEdit,
  OTHER: Clock,
};

export function ApplicationTimeline({ applicationId, interactions }: { applicationId: string; interactions: Interaction[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("EMAIL");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!summary.trim()) return;
    startTransition(async () => {
      await logApplicationInteraction(applicationId, { type, summary, details });
      setSummary("");
      setDetails("");
      setOpen(false);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Ajouter un événement
        </Button>
      </div>
      {interactions.length === 0 ? (
        <EmptyState icon={Clock} title="Aucun événement pour l'instant" />
      ) : (
        <ol className="flex flex-col gap-4 border-l border-border pl-4">
          {interactions.map((i) => {
            const Icon = ICONS[i.type] ?? Clock;
            return (
              <li key={i.id} className="relative">
                <span className="absolute -left-[21px] flex size-4 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                  <Icon className="size-2.5" />
                </span>
                <p className="text-sm text-foreground">{i.summary}</p>
                {i.details && <p className="text-sm text-muted-foreground">{i.details}</p>}
                <p className="text-xs text-subtle-foreground">{formatDateTime(i.date)}</p>
              </li>
            );
          })}
        </ol>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Nouvel événement</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3 pb-5">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Résumé" value={summary} onChange={(e) => setSummary(e.target.value)} />
            <Textarea placeholder="Détails (optionnel)" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} />
            <div className="flex justify-end">
              <Button onClick={submit} disabled={pending || !summary.trim()}>
                Ajouter
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
