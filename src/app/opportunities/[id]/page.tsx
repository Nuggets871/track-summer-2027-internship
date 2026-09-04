import { notFound } from "next/navigation";
import { getApplicationDetail } from "@/lib/data/applications";
import { getProfile } from "@/lib/data/profile";
import { ensureApplicationPipelineStages } from "@/lib/data/pipeline-stages";
import { isAiConfigured } from "@/lib/ai/provider";
import { safeJsonParse } from "@/lib/utils";
import { OpportunityHeader } from "@/components/opportunities/opportunity-header";
import { OpportunityOverview } from "@/components/opportunities/opportunity-overview";
import { OpportunityFit } from "@/components/opportunities/opportunity-fit";
import { OpportunityApplication } from "@/components/opportunities/opportunity-application";
import { OpportunityAiActions } from "@/components/opportunities/opportunity-ai-actions";
import { OpportunityStatusShortcut } from "@/components/opportunities/opportunity-status-shortcut";
import { OpportunityChat } from "@/components/opportunities/opportunity-chat";

export default async function OpportunityDetailPage({ params }: PageProps<"/opportunities/[id]">) {
  const { id } = await params;
  const [application, profile, stages, aiConfigured] = await Promise.all([
    getApplicationDetail(id),
    getProfile(),
    ensureApplicationPipelineStages(),
    isAiConfigured(),
  ]);

  if (!application) notFound();

  const jobAnalysis = application.jobAnalysis
    ? {
        ...application.jobAnalysis,
        requiredSkillsList: safeJsonParse<string[]>(application.jobAnalysis.requiredSkills, []),
        requiredLanguagesList: safeJsonParse<string[]>(application.jobAnalysis.requiredLanguages, []),
        matchBreakdownList: safeJsonParse<{ key: string; label: string; value: number; weight: number; contribution: number }[]>(
          application.jobAnalysis.matchBreakdown,
          [],
        ),
        strengthsList: safeJsonParse<string[]>(application.jobAnalysis.strengths, []),
        watchoutsList: safeJsonParse<string[]>(application.jobAnalysis.watchouts, []),
        missingSkillsList: safeJsonParse<string[]>(application.jobAnalysis.missingSkills, []),
        eligibilityNotesList: safeJsonParse<string[]>(application.jobAnalysis.eligibilityNotes, []),
      }
    : null;

  const profileStale = jobAnalysis?.profileUpdatedAtSnapshot
    ? profile.updatedAt.getTime() > jobAnalysis.profileUpdatedAtSnapshot.getTime()
    : false;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-16">
      <OpportunityHeader application={application} stages={stages} />
      <OpportunityOverview application={application} />
      {application.applicationType === "ADVERTISED" && (
        <OpportunityFit application={application} jobAnalysis={jobAnalysis} profileStale={profileStale} />
      )}
      <OpportunityApplication application={application} profile={profile} />
      <OpportunityChat applicationId={application.id} initialHistory={application.aiChatHistory} aiConfigured={aiConfigured} />
      <OpportunityAiActions
        applicationId={application.id}
        aiConfigured={aiConfigured}
        interviewPrepNotes={application.interviewPrepNotes}
        hasCv={!!profile.cvRawText}
        statusKey={application.status.key}
        applicationType={application.applicationType}
      />
      <OpportunityStatusShortcut applicationId={application.id} statusKey={application.status.key} />
    </div>
  );
}
