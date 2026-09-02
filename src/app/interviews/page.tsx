import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { QuestionBank } from "@/components/interviews/question-bank";
import { INTERVIEW_STATUSES, labelFor } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { MessagesSquare } from "lucide-react";

export const metadata = { title: "Entretiens" };

export default async function InterviewsPage() {
  const [interviews, bankQuestions] = await Promise.all([
    prisma.interview.findMany({
      include: { application: { include: { company: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.question.findMany({ where: { isBankItem: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const upcoming = interviews.filter((i) => i.status === "SCHEDULED");
  const past = interviews.filter((i) => i.status !== "SCHEDULED");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Entretiens</h1>
        <p className="text-sm text-muted-foreground">Tous vos entretiens planifiés, et votre banque de questions personnelle.</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">À venir ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Passés ({past.length})</TabsTrigger>
          <TabsTrigger value="bank">Banque de questions</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="Aucun entretien planifié" />
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((i) => (
                <Link key={i.id} href={`/applications/${i.applicationId}`}>
                  <Card className="flex items-center justify-between gap-3 p-3 hover:border-border-strong">
                    <div>
                      <p className="text-sm font-medium text-foreground">{i.roundLabel} — {i.application.company.name}</p>
                      <p className="text-xs text-muted-foreground">{i.scheduledAt ? formatDateTime(i.scheduledAt) : "Date à définir"}</p>
                    </div>
                    <Badge variant="outline">{labelFor(INTERVIEW_STATUSES, i.status)}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="past">
          {past.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="Aucun entretien passé" />
          ) : (
            <div className="flex flex-col gap-2">
              {past.map((i) => (
                <Link key={i.id} href={`/applications/${i.applicationId}`}>
                  <Card className="flex items-center justify-between gap-3 p-3 hover:border-border-strong">
                    <div>
                      <p className="text-sm font-medium text-foreground">{i.roundLabel} — {i.application.company.name}</p>
                      <p className="text-xs text-muted-foreground">{i.scheduledAt ? formatDateTime(i.scheduledAt) : "—"}</p>
                    </div>
                    <Badge variant="outline">{labelFor(INTERVIEW_STATUSES, i.status)}</Badge>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Questions génériques réutilisables</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionBank questions={bankQuestions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
