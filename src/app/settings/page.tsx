import { getSettings } from "@/lib/data/settings";
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { ScoringSettingsForm } from "@/components/settings/scoring-settings-form";
import { PipelineStagesManager } from "@/components/settings/pipeline-stages-manager";
import { DataBackupPanel } from "@/components/settings/data-backup-panel";
import { ThemeSettingsCard } from "@/components/settings/theme-settings-card";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  const [settings, countries, stages] = await Promise.all([
    getSettings(),
    prisma.country.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.pipelineStage.findMany({ where: { kind: "APPLICATION" }, orderBy: { order: "asc" } }),
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
          <TabsTrigger value="appearance">Apparence</TabsTrigger>
          <TabsTrigger value="scoring">Relances & scoring</TabsTrigger>
          <TabsTrigger value="statuses">Statuts</TabsTrigger>
          <TabsTrigger value="data">Données & backup</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralSettingsForm settings={settings} countryOptions={countries} />
        </TabsContent>
        <TabsContent value="appearance">
          <ThemeSettingsCard />
        </TabsContent>
        <TabsContent value="scoring">
          <ScoringSettingsForm settings={settings} />
        </TabsContent>
        <TabsContent value="statuses">
          <PipelineStagesManager stages={stages} />
        </TabsContent>
        <TabsContent value="data">
          <DataBackupPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
