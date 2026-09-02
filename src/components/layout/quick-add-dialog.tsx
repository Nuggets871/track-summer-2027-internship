"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { useUIStore } from "@/store/ui-store";
import { QuickAddApplicationPanel } from "@/components/layout/quick-add-application-panel";
import { CompanyForm } from "@/components/forms/company-form";
import { ContactForm } from "@/components/forms/contact-form";
import { TaskForm } from "@/components/forms/task-form";
import { EventForm } from "@/components/forms/event-form";
import { NoteForm } from "@/components/forms/note-form";
import type { ReferenceData } from "@/lib/data/reference";

const TITLES: Record<string, string> = {
  application: "Nouvelle candidature",
  company: "Nouvelle entreprise",
  contact: "Nouveau contact",
  task: "Nouvelle tâche",
  event: "Nouvel événement",
  note: "Nouvelle note",
};

export function QuickAddDialog({ reference }: { reference: ReferenceData }) {
  const quickAdd = useUIStore((s) => s.quickAdd);
  const closeQuickAdd = useUIStore((s) => s.closeQuickAdd);

  return (
    <Dialog open={!!quickAdd} onOpenChange={(open) => !open && closeQuickAdd()}>
      <DialogContent size={quickAdd === "application" ? "xl" : "lg"}>
        <DialogHeader>
          <DialogTitle>{quickAdd ? TITLES[quickAdd] : ""}</DialogTitle>
        </DialogHeader>
        <DialogBody className="pb-5">
          {quickAdd === "application" && <QuickAddApplicationPanel reference={reference} onSuccess={closeQuickAdd} />}
          {quickAdd === "company" && <CompanyForm reference={reference} onSuccess={closeQuickAdd} />}
          {quickAdd === "contact" && <ContactForm reference={reference} onSuccess={closeQuickAdd} />}
          {quickAdd === "task" && <TaskForm reference={reference} onSuccess={closeQuickAdd} />}
          {quickAdd === "event" && <EventForm reference={reference} onSuccess={closeQuickAdd} />}
          {quickAdd === "note" && <NoteForm reference={reference} onSuccess={closeQuickAdd} />}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
