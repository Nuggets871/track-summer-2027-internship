"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { ContactForm } from "@/components/forms/contact-form";
import { labelFor, CONTACT_TYPES } from "@/lib/constants";
import type { ReferenceData } from "@/lib/data/reference";
import type { CompanyDetail } from "@/components/companies/types";

export function CompanyContactsTab({ company, reference }: { company: CompanyDetail; reference: ReferenceData }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Nouveau contact
        </Button>
      </div>
      {company.contacts.length === 0 ? (
        <EmptyState icon={Users} title="Aucun contact pour cette entreprise" />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {company.contacts.map((c) => (
            <Link key={c.id} href={`/contacts/${c.id}`}>
              <Card className="flex items-center gap-3 p-3 hover:border-border-strong">
                <Avatar name={`${c.firstName} ${c.lastName}`} size={32} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.position}</p>
                </div>
                <Badge variant="outline">{labelFor(CONTACT_TYPES, c.contactType)}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nouveau contact — {company.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <ContactForm reference={reference} defaultCompanyId={company.id} onSuccess={() => setOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
