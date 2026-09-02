"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Users, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { linkContactToApplication } from "@/lib/actions/contacts";
import { CONTACT_TYPES, labelFor } from "@/lib/constants";
import type { ReferenceData } from "@/lib/data/reference";
import type { ApplicationDetail } from "@/components/applications/types";

export function ApplicationContactsTab({ application, reference }: { application: ApplicationDetail; reference: ReferenceData }) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();

  const linkedIds = new Set([application.primaryContactId, ...application.contacts.map((c) => c.id)].filter(Boolean));
  const available = reference.contacts.filter((c) => !linkedIds.has(c.id));
  const allContacts = [application.primaryContact, ...application.contacts].filter(
    (c): c is NonNullable<typeof c> => !!c,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Lier un contact existant..." />
          </SelectTrigger>
          <SelectContent>
            {available.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={!selected || pending}
          onClick={() =>
            startTransition(async () => {
              await linkContactToApplication(selected, application.id);
              setSelected("");
            })
          }
        >
          <Link2 /> Lier
        </Button>
      </div>

      {allContacts.length === 0 ? (
        <EmptyState icon={Users} title="Aucun contact lié à cette candidature" />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {allContacts.map((c) => (
            <Link key={c.id} href={`/contacts/${c.id}`}>
              <Card className="flex items-center gap-3 p-3 hover:border-border-strong">
                <Avatar name={`${c.firstName} ${c.lastName}`} size={32} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {c.firstName} {c.lastName}
                    {c.id === application.primaryContactId && (
                      <span className="ml-1.5 text-xs font-normal text-primary">(principal)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.position}</p>
                </div>
                <Badge variant="outline">{labelFor(CONTACT_TYPES, c.contactType)}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
