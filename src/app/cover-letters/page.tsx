import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { COVER_LETTER_STATUSES, labelFor } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { FileText } from "lucide-react";

export const metadata = { title: "Lettres de motivation" };

export default async function CoverLettersPage() {
  const letters = await prisma.coverLetter.findMany({
    include: { application: { include: { company: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Lettres de motivation</h1>
        <p className="text-sm text-muted-foreground">Suivez le statut et les versions de chaque lettre. Modifiez-les depuis la candidature associée.</p>
      </div>
      {letters.length === 0 ? (
        <EmptyState icon={FileText} title="Aucune lettre de motivation suivie" description="Ajoutez-en une depuis l'onglet Overview d'une candidature." />
      ) : (
        <div className="flex flex-col gap-2">
          {letters.map((l) => (
            <Link key={l.id} href={`/applications/${l.applicationId}`}>
              <Card className="flex items-center justify-between gap-3 p-3 hover:border-border-strong">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{l.application.company.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.application.title} · {l.version}</p>
                  {l.personalizedElements && <p className="truncate text-xs text-subtle-foreground">{l.personalizedElements}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(l.updatedAt)}</span>
                <Badge variant="outline">{labelFor(COVER_LETTER_STATUSES, l.status)}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
