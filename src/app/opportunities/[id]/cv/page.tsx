import { notFound } from "next/navigation";
import { getApplicationDetail } from "@/lib/data/applications";
import { getProfile } from "@/lib/data/profile";
import { isAiConfigured } from "@/lib/ai/provider";
import { parseCvContent } from "@/lib/cv-content";
import { CvStudio } from "@/components/opportunities/cv-studio";

export const metadata = { title: "CV adapté" };

export default async function CvPage({ params }: PageProps<"/opportunities/[id]/cv">) {
  const { id } = await params;
  const [application, profile, aiConfigured] = await Promise.all([
    getApplicationDetail(id),
    getProfile(),
    isAiConfigured(),
  ]);
  if (!application) notFound();

  const content = parseCvContent(application.generatedCv?.content);
  const candidateName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Candidat";
  const contactLines = [profile.location, profile.email, profile.phone].filter(
    (value): value is string => Boolean(value && value.trim()),
  );
  const linkLines = [profile.linkedinUrl, profile.githubUrl, profile.portfolioUrl].filter(
    (value): value is string => Boolean(value && value.trim()),
  );

  return (
    <CvStudio
      applicationId={application.id}
      title={application.title}
      companyName={application.company.name}
      statusLabel={application.status.label}
      cv={
        content && application.generatedCv
          ? {
              content,
              language: application.generatedCv.language,
              version: application.generatedCv.version,
              updatedAt: application.generatedCv.updatedAt,
            }
          : null
      }
      aiConfigured={aiConfigured}
      hasCvSource={!!profile.cvRawText}
      candidateName={candidateName}
      contactLines={contactLines}
      linkLines={linkLines}
    />
  );
}
