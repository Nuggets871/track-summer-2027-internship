import { getContactsWithRelations } from "@/lib/data/contacts";
import { getReferenceData } from "@/lib/data/reference";
import { ContactsTable } from "@/components/contacts/contacts-table";

export const metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const [contacts, reference] = await Promise.all([getContactsWithRelations(), getReferenceData()]);
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Contacts</h1>
        <p className="text-sm text-muted-foreground">Votre CRM personnel : recruteurs, alumni, managers, relations...</p>
      </div>
      <ContactsTable contacts={contacts} reference={reference} />
    </div>
  );
}
