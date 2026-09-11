import Link from "next/link";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export type OnboardingStep = {
  label: string;
  href: string;
  done: boolean;
};

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const remaining = steps.filter((step) => !step.done);
  if (remaining.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary-soft/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="size-4 text-primary" /> Pour bien démarrer
        </CardTitle>
        <CardDescription>{remaining.length} étape{remaining.length > 1 ? "s" : ""} pour tirer le meilleur de l&apos;app.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        {steps.map((step) => (
          <Link key={step.label} href={step.href} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-surface/60">
            {step.done ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <Circle className="size-4 shrink-0 text-muted-foreground" />}
            <span className={step.done ? "text-muted-foreground line-through" : "text-foreground"}>{step.label}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
