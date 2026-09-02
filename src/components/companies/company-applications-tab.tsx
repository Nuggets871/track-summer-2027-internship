"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { ApplicationForm } from "@/components/forms/application-form";
import { formatDate } from "@/lib/utils";
import { Briefcase } from "lucide-react";
import type { ReferenceData } from "@/lib/data/reference";
import type { CompanyDetail } from "@/components/companies/types";

export function CompanyApplicationsTab({ company, reference }: { company: CompanyDetail; reference: ReferenceData }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus /> Nouvelle candidature
        </Button>
      </div>
      {company.applications.length === 0 ? (
        <EmptyState icon={Briefcase} title="Aucune candidature pour cette entreprise" />
      ) : (
        <div className="flex flex-col gap-2">
          {company.applications.map((a) => (
            <Link key={a.id} href={`/applications/${a.id}`}>
              <Card className="flex items-center justify-between gap-3 p-3 hover:border-border-strong">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">Découverte le {formatDate(a.discoveredAt)}</p>
                </div>
                <Badge dotColor={a.status.color}>{a.status.label}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="xl">
          <DialogHeader>
            <DialogTitle>Nouvelle candidature — {company.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <ApplicationForm reference={reference} defaultCompanyId={company.id} onSuccess={() => setOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}
