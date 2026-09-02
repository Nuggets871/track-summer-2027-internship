"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
];

export function ThemeSettingsCard() {
  const { theme, setTheme } = useTheme();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Thème</CardTitle>
        <CardDescription>Choisissez l&apos;apparence de l&apos;application.</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setTheme(o.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-sm transition-colors hover:border-border-strong",
              theme === o.value && "border-primary bg-primary-soft text-primary-soft-foreground",
            )}
          >
            <o.icon className="size-5" />
            {o.label}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
