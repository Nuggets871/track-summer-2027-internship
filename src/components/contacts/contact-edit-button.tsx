"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { ContactForm } from "@/components/forms/contact-form";
import type { ReferenceData } from "@/lib/data/reference";
import type { Contact } from "@prisma/client";

export function ContactEditButton({ contact, reference }: { contact: Contact; reference: ReferenceData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil /> Modifier
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              Modifier {contact.firstName} {contact.lastName}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <ContactForm reference={reference} contact={contact} onSuccess={() => setOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
