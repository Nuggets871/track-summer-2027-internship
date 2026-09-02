import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Link2, Pencil } from "lucide-react";
import { getContactDetail } from "@/lib/data/contacts";
import { getReferenceData } from "@/lib/data/reference";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CONTACT_TYPES, NETWORKING_STAGES, labelFor } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { ContactEditButton } from "@/components/contacts/contact-edit-button";
import { ContactTimeline } from "@/components/contacts/contact-timeline";
import { NotesPanel } from "@/components/shared/notes-panel";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contact, reference] = await Promise.all([getContactDetail(id), getReferenceData()]);
  if (!contact) notFound();

  const applications = [...contact.primaryForApplications, ...contact.applications.filter((a) => !contact.primaryForApplications.some((p) => p.id === a.id))];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={`${contact.firstName} ${contact.lastName}`} size={48} />
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[contact.position, contact.company?.name].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <Badge variant="outline">{labelFor(CONTACT_TYPES, contact.contactType)}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {contact.email && (
            <Link href={`mailto:${contact.email}`} className="text-muted-foreground hover:text-foreground">
              <Mail className="size-4" />
            </Link>
          )}
          {contact.phone && (
            <Link href={`tel:${contact.phone}`} className="text-muted-foreground hover:text-foreground">
              <Phone className="size-4" />
            </Link>
          )}
          {contact.linkedin && (
            <Link href={contact.linkedin} target="_blank" className="text-muted-foreground hover:text-foreground">
              <Link2 className="size-4" />
            </Link>
          )}
          <ContactEditButton contact={contact} reference={reference} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Proximité</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`size-3 rounded-full ${i < contact.relationshipStrength ? "bg-primary" : "bg-surface-muted"}`} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Networking</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">
              {contact.networkingStage ? NETWORKING_STAGES.find((s) => s.key === contact.networkingStage)?.label : "Non défini"}
            </p>
            <p className="text-xs text-muted-foreground">
              Prochaine relance : {formatDate(contact.nextFollowUpDate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dernière interaction</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{formatDate(contact.lastInteractionAt)}</p>
          </CardContent>
        </Card>
      </div>

      {applications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Candidatures associées</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {applications.map((a) => (
              <Link key={a.id} href={`/applications/${a.id}`} className="flex items-center justify-between text-sm hover:underline">
                <span>
                  {a.company.name} — {a.title}
                </span>
                <Badge dotColor={a.status.color}>{a.status.label}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline">
          <ContactTimeline contactId={contact.id} interactions={contact.interactions} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesPanel notes={contact.notesList} contactId={contact.id} />
        </TabsContent>
      </Tabs>

      {contact.notes && (
        <p className="text-sm text-muted-foreground">
          <Pencil className="mr-1 inline size-3.5" /> {contact.notes}
        </p>
      )}
    </div>
  );
}
