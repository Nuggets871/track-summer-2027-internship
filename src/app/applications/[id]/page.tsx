import { notFound } from "next/navigation";
import { getApplicationDetail } from "@/lib/data/applications";
import { getReferenceData } from "@/lib/data/reference";
import { getSettings } from "@/lib/data/settings";
import { getProfile } from "@/lib/data/profile";
import { computePriorityScore } from "@/lib/scoring";
import { TERMINAL_STAGE_KEYS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationHeader } from "@/components/applications/application-header";
import { ApplicationOverviewTab } from "@/components/applications/application-overview-tab";
import { ApplicationTimeline } from "@/components/applications/application-timeline";
import { ApplicationContactsTab } from "@/components/applications/application-contacts-tab";
import { ApplicationTasksTab } from "@/components/applications/application-tasks-tab";
import { ApplicationPrepTab } from "@/components/applications/application-prep-tab";
import { InterviewList } from "@/components/interviews/interview-list";
import { InterviewPrepEditor } from "@/components/interviews/interview-prep-editor";
import { DocumentsPanel } from "@/components/documents/documents-panel";
import { NotesPanel } from "@/components/shared/notes-panel";

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const [application, reference, settings, profile] = await Promise.all([
    getApplicationDetail(id),
    getReferenceData(),
    getSettings(),
    getProfile(),
  ]);
  if (!application) notFound();

  const priorityScore = computePriorityScore(
    {
      interestScore: application.interestScore,
      deadline: application.deadline,
      fitScore: application.company.fitScore,
      estimatedProbability: application.estimatedProbability,
      relationshipStrength: application.primaryContact?.relationshipStrength ?? null,
      lastInteractionAt: application.lastInteractionAt,
      discoveredAt: application.discoveredAt,
      isTerminal: TERMINAL_STAGE_KEYS.includes(application.status.key),
      staleThresholdDays: settings.staleOpportunityDays,
    },
    settings.priorityWeights,
  );

  const isStale = Boolean(
    application.jobAnalysis?.profileUpdatedAtSnapshot &&
      profile.updatedAt.getTime() > application.jobAnalysis.profileUpdatedAtSnapshot.getTime(),
  );

  return (
    <div className="flex flex-col gap-5">
      <ApplicationHeader application={application} reference={reference} stages={reference.stages} />

      <Tabs defaultValue={tab === "preparation" ? "preparation" : "overview"}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="preparation">Préparation</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="interview">Interview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ApplicationOverviewTab application={application} priorityScore={priorityScore} />
        </TabsContent>
        <TabsContent value="preparation">
          <ApplicationPrepTab
            applicationId={application.id}
            companyId={application.companyId}
            jobAnalysis={application.jobAnalysis}
            jobUrl={application.jobUrl}
            isStale={isStale}
          />
        </TabsContent>
        <TabsContent value="timeline">
          <ApplicationTimeline applicationId={application.id} interactions={application.interactions} />
        </TabsContent>
        <TabsContent value="contacts">
          <ApplicationContactsTab application={application} reference={reference} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsPanel documents={application.documents} applicationId={application.id} companyId={application.companyId} />
        </TabsContent>
        <TabsContent value="interview" className="flex flex-col gap-6">
          <InterviewList applicationId={application.id} companyId={application.companyId} interviews={application.interviews} />
          <InterviewPrepEditor applicationId={application.id} prep={application.interviewPrep} />
        </TabsContent>
        <TabsContent value="tasks">
          <ApplicationTasksTab applicationId={application.id} tasks={application.tasks} reference={reference} />
        </TabsContent>
        <TabsContent value="notes">
          <NotesPanel notes={application.notesList} applicationId={application.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
