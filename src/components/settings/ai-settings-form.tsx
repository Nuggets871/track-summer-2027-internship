"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveDeepSeekKey, deleteDeepSeekKey, testAiConnection, getAiKeyStatus } from "@/lib/actions/ai-settings";

type Status = { configured: boolean; masked: string | null; source: "database" | "env" | "none" };

export function AiSettingsForm({ status }: { status: Status }) {
  const [pending, startTransition] = useTransition();
  const [key, setKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [current, setCurrent] = useState(status);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const save = () => {
    if (!key.trim()) {
      toast.error("Entre une clé API avant d'enregistrer.");
      return;
    }
    startTransition(async () => {
      await saveDeepSeekKey(key.trim());
      setKey("");
      setTestResult(null);
      setCurrent(await getAiKeyStatus());
      toast.success("Clé enregistrée");
    });
  };

  const test = () => {
    startTransition(async () => {
      const result = await testAiConnection();
      setTestResult(result);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  };

  const remove = () => {
    startTransition(async () => {
      await deleteDeepSeekKey();
      setCurrent(await getAiKeyStatus());
      setTestResult(null);
      toast.success("Clé supprimée");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Intelligence artificielle</CardTitle>
        <CardDescription>
          Utilisée pour l&apos;extraction avancée d&apos;offres, les lettres de motivation, l&apos;analyse de CV et la préparation d&apos;entretien.
          La clé reste stockée localement dans ta base de données — jamais dans le code, jamais journalisée.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Fournisseur :</span>
          <Badge variant="outline">DeepSeek</Badge>
          {current.configured ? (
            <Badge variant="success">
              <CheckCircle2 className="size-3" /> Configuré {current.source === "env" ? "(via .env)" : ""}
            </Badge>
          ) : (
            <Badge variant="outline">
              <XCircle className="size-3" /> Non configuré
            </Badge>
          )}
        </div>

        {current.masked && (
          <p className="text-sm text-muted-foreground">
            Clé actuelle : <span className="font-mono">{current.masked}</span>
          </p>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nouvelle clé API DeepSeek</label>
            <div className="relative">
              <Input
                type={reveal ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="sk-..."
                className="pr-9"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setReveal((r) => !r)}
              >
                {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button onClick={save} disabled={pending}>
            Enregistrer
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={test} disabled={pending || !current.configured}>
            Tester la connexion
          </Button>
          {current.source === "database" && (
            <Button variant="ghost" size="sm" onClick={remove} disabled={pending}>
              <Trash2 className="size-3.5" /> Supprimer la clé
            </Button>
          )}
        </div>

        {testResult && (
          <p className={`text-sm ${testResult.ok ? "text-success-foreground" : "text-danger-foreground"}`}>{testResult.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
