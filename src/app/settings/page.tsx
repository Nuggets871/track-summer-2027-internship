import { getSettings } from "@/lib/data/settings";
import { getAiKeyStatus } from "@/lib/actions/ai-settings";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { MatchingSettingsForm } from "@/components/settings/matching-settings-form";
import { AiSettingsForm } from "@/components/settings/ai-settings-form";
import { DataBackupPanel } from "@/components/settings/data-backup-panel";
import { ThemeSettingsCard } from "@/components/settings/theme-settings-card";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const [settings, aiStatus, countries] = await Promise.all([
    getSettings(),
    getAiKeyStatus(),
    prisma.country.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Personnalisez l&apos;application selon votre recherche.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="ai">IA</TabsTrigger>
          <TabsTrigger value="matching">Matching</TabsTrigger>
          <TabsTrigger value="appearance">Apparence</TabsTrigger>
          <TabsTrigger value="data">Données & backup</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralSettingsForm settings={settings} countryOptions={countries} />
        </TabsContent>
        <TabsContent value="ai">
          <AiSettingsForm status={aiStatus} />
        </TabsContent>
        <TabsContent value="matching">
          <MatchingSettingsForm matchWeights={settings.matchWeights} />
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
