"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { CompanyForm } from "@/components/forms/company-form";
import type { ReferenceData } from "@/lib/data/reference";
import type { Company } from "@prisma/client";

export function CompanyEditButton({ company, reference }: { company: Company; reference: ReferenceData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil /> Modifier
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Modifier {company.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <CompanyForm reference={reference} company={company} onSuccess={() => setOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
