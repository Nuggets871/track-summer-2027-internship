import { getAiKeyStatus } from "@/lib/actions/ai-settings";
import { getTrashedApplications } from "@/lib/data/applications";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { DataBackupPanel } from "@/components/settings/data-backup-panel";
import { ThemeSettingsCard } from "@/components/settings/theme-settings-card";
import { TrashPanel } from "@/components/settings/trash-panel";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const [aiStatus, trashed] = await Promise.all([getAiKeyStatus(), getTrashedApplications()]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Configure l’IA, l’apparence et la protection de tes données. Ton dossier candidat reste dans Profil.</p>
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="appearance">Apparence</TabsTrigger>
          <TabsTrigger value="data">Confidentialité & données</TabsTrigger>
        </TabsList>
        <TabsContent value="ai">
          <AiSettingsForm status={aiStatus} />
        </TabsContent>
        <TabsContent value="appearance">
          <ThemeSettingsCard />
        </TabsContent>
        <TabsContent value="data">
          <div className="flex flex-col gap-4">
            <DataBackupPanel />
            <TrashPanel
              items={trashed.map((application) => ({
                id: application.id,
                title: application.title,
                companyName: application.company.name,
                deletedAt: application.deletedAt,
              }))}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
