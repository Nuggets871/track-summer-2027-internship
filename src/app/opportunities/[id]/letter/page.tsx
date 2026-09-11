import { notFound } from "next/navigation";
import { getApplicationDetail } from "@/lib/data/applications";
import { getProfile } from "@/lib/data/profile";
import { isAiConfigured } from "@/lib/ai/provider";
import { CoverLetterStudio } from "@/components/opportunities/cover-letter-studio";

export const metadata = { title: "Lettre de motivation" };

export default async function CoverLetterPage({ params }: PageProps<"/opportunities/[id]/letter">) {
  const { id } = await params;
  const [application, profile, aiConfigured] = await Promise.all([
    getApplicationDetail(id),
    getProfile(),
    isAiConfigured(),
  ]);
  if (!application) notFound();

  return (
    <CoverLetterStudio
      applicationId={application.id}
      title={application.title}
      companyName={application.company.name}
      statusLabel={application.status.label}
      letter={
        application.coverLetter
          ? {
              content: application.coverLetter.content,
              tone: application.coverLetter.tone,
              language: application.coverLetter.language,
              version: application.coverLetter.version,
              updatedAt: application.coverLetter.updatedAt,
            }
          : null
      }
      aiConfigured={aiConfigured}
      hasReference={!!profile.coverLetterReference}
    />
  );
}
