"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { updateSettings } from "@/lib/actions/settings";
import { DEFAULT_CURRENCIES } from "@/lib/constants";
import type { AppSettings } from "@/lib/data/settings";

function toDateInput(d: Date | null) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function GeneralSettingsForm({ settings, countryOptions }: { settings: AppSettings; countryOptions: { id: string; name: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [userName, setUserName] = useState(settings.userName);
  const [userEmail, setUserEmail] = useState(settings.userEmail);
  const [periodStart, setPeriodStart] = useState(toDateInput(settings.searchPeriodStart));
  const [periodEnd, setPeriodEnd] = useState(toDateInput(settings.searchPeriodEnd));
  const [preferredCountries, setPreferredCountries] = useState<string[]>(settings.preferredCountries);
  const [preferredSectors, setPreferredSectors] = useState(settings.preferredSectors.join(", "));
  const [currencies, setCurrencies] = useState<string[]>(settings.preferredCurrencies);

  const save = () => {
    startTransition(async () => {
      await updateSettings({
        userName,
        userEmail,
        searchPeriodStart: periodStart ? new Date(periodStart) : null,
        searchPeriodEnd: periodEnd ? new Date(periodEnd) : null,
        preferredCountries,
        preferredSectors: preferredSectors.split(",").map((s) => s.trim()).filter(Boolean),
        preferredCurrencies: currencies,
      });
      toast.success("Préférences enregistrées");
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nom</label>
            <Input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Votre nom" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Email</label>
            <Input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="vous@example.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Début de la période recherchée</label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Fin de la période recherchée</label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Préférences de recherche</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Pays préférés</label>
            <div className="flex flex-wrap gap-2">
              {countryOptions.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-sm">
                  <Checkbox
                    checked={preferredCountries.includes(c.name)}
                    onCheckedChange={(checked) =>
                      setPreferredCountries((prev) => (checked ? [...prev, c.name] : prev.filter((n) => n !== c.name)))
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Secteurs préférés (séparés par des virgules)</label>
            <Input value={preferredSectors} onChange={(e) => setPreferredSectors(e.target.value)} placeholder="Finance, Tech, Conseil" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Devises suivies</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CURRENCIES.map((cur) => (
                <label key={cur} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-sm">
                  <Checkbox
                    checked={currencies.includes(cur)}
                    onCheckedChange={(checked) => setCurrencies((prev) => (checked ? [...prev, cur] : prev.filter((c) => c !== cur)))}
                  />
                  {cur}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
