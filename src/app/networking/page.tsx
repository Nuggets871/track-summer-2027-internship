import { getContactsWithRelations } from "@/lib/data/contacts";
import { NetworkingBoardClient as NetworkingBoard } from "@/components/networking/networking-board-client";

export const metadata = { title: "Networking" };

export default async function NetworkingPage() {
  const contacts = await getContactsWithRelations();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Networking</h1>
        <p className="text-sm text-muted-foreground">Suivez votre pipeline de networking, de l&apos;identification jusqu&apos;au referral.</p>
      </div>
      <NetworkingBoard contacts={contacts} />
    </div>
  );
}
