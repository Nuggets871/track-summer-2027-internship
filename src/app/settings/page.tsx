import { getAiKeyStatus } from "@/lib/actions/ai-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { DataBackupPanel } from "@/components/settings/data-backup-panel";
import { ThemeSettingsCard } from "@/components/settings/theme-settings-card";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const aiStatus = await getAiKeyStatus();

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
          <DataBackupPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
