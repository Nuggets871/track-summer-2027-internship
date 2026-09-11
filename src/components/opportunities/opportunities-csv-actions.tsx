"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Papa from "papaparse";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportApplicationsCsv, importApplicationsCsv } from "@/lib/actions/backup";

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function OpportunitiesCsvActions() {
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleExport = () => {
    startTransition(async () => {
      const csv = await exportApplicationsCsv();
      downloadText(`opportunites-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
      toast.success("Export CSV téléchargé");
    });
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = Papa.parse<Record<string, string>>(String(reader.result), { header: true, skipEmptyLines: true });
      const rows = parsed.data.filter((row) => Object.keys(row).length > 0);
      if (rows.length === 0) {
        toast.error("Aucune ligne exploitable dans ce fichier.");
        return;
      }
      startTransition(async () => {
        try {
          const imported = await importApplicationsCsv(rows);
          toast.success(`${imported} opportunité${imported > 1 ? "s" : ""} importée${imported > 1 ? "s" : ""}`);
          router.refresh();
        } catch {
          toast.error("Import CSV impossible — vérifie le format du fichier.");
        }
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExport} disabled={pending}>
        <Download className="size-3.5" /> Exporter CSV
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImportFile(file);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={pending}>
        <Upload className="size-3.5" /> Importer CSV
      </Button>
    </div>
  );
}
