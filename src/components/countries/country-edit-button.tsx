"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { CountryForm } from "@/components/countries/country-form";
import type { Country } from "@prisma/client";

export function CountryEditButton({ country }: { country: Country }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil /> Modifier
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Modifier {country.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="pb-5">
            <CountryForm country={country} onSuccess={() => setOpen(false)} />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
