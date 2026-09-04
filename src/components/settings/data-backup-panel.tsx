"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Upload, Trash2, DatabaseBackup } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { exportFullBackup, importFullBackup, clearDemoData } from "@/lib/actions/backup";

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataBackupPanel() {
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    startTransition(async () => {
      const json = await exportFullBackup();
      downloadText(`backup-${new Date().toISOString().slice(0, 10)}.json`, json, "application/json");
      toast.success("Backup téléchargé");
    });
  };

  const handleImportFile = (file: File) => {
    if (!confirm("Importer ce backup va REMPLACER toutes les données actuelles. Continuer ?")) return;
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        try {
          await importFullBackup(reader.result as string);
          toast.success("Backup restauré");
        } catch {
          toast.error("Fichier de backup invalide");
        }
      });
    };
    reader.readAsText(file);
  };

  const handleClearDemo = () => {
    if (!confirm("Supprimer toutes les données de démonstration ? Cette action est irréversible.")) return;
    startTransition(async () => {
      await clearDemoData();
      toast.success("Données de démonstration supprimées");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Backup complet</CardTitle>
          <CardDescription>
            Exporte ou restaure tes données au format JSON. La clé API IA n&apos;est jamais incluse dans le fichier et une importation ne la remplace pas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
            <Download /> Exporter tout (JSON)
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={pending}>
            <Upload /> Importer un backup
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Données de démonstration</CardTitle>
          <CardDescription>Les candidatures, entreprises, contacts et tâches d&apos;exemple sont marquées comme telles.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" onClick={handleClearDemo} disabled={pending}>
            <Trash2 /> Supprimer les données de démo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export CSV des candidatures</CardTitle>
          <CardDescription>Disponible directement depuis la page Opportunités.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <DatabaseBackup className="size-4" /> Rendez-vous sur la page{" "}
            <Link href="/opportunities" className="text-primary hover:underline">
              Opportunités
            </Link>{" "}
            pour l&apos;export/import CSV.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
