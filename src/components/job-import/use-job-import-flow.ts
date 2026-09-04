"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  analyzeJobUrl,
  analyzeJobText,
  saveAnalyzedOpportunity,
  type JobAnalysisPayload,
} from "@/lib/actions/job-import";
import { addSkillToProfile } from "@/lib/actions/profile";
import type { ExtractedJobData } from "@/lib/job-extraction";

export type FlowStep = "idle" | "analyzing" | "paste_fallback" | "review" | "already_applied";

export type ReviewFields = {
  title: string;
  companyName: string;
  countryName: string;
  city: string;
  remoteType: "" | "REMOTE" | "HYBRID" | "ONSITE";
  salaryAmount: string;
  salaryCurrency: string;
  durationMonths: string;
  startDate: string;
  endDate: string;
  deadline: string;
  notes: string;
};

function toReviewFields(extracted: ExtractedJobData): ReviewFields {
  return {
    title: extracted.title ?? "",
    companyName: extracted.companyName ?? "",
    countryName: extracted.countryName ?? "",
    city: extracted.city ?? "",
    remoteType: extracted.remoteType ?? "",
    salaryAmount: extracted.salaryAmount?.toString() ?? "",
    salaryCurrency: extracted.salaryCurrency ?? "EUR",
    durationMonths: extracted.durationMonths?.toString() ?? "",
    startDate: extracted.startDate ?? "",
    endDate: extracted.endDate ?? "",
    deadline: extracted.deadline ?? "",
    notes: "",
  };
}

export function useJobImportFlow(
  onDone?: (applicationId: string) => void,
  initialMode: "link" | "description" = "link",
  onDismiss?: () => void,
) {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>(initialMode === "description" ? "paste_fallback" : "idle");
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [payload, setPayload] = useState<JobAnalysisPayload | null>(null);
  const [fields, setFields] = useState<ReviewFields | null>(null);
  const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

  // "already applied" extra fields
  const [appliedAt, setAppliedAt] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [applicationNote, setApplicationNote] = useState("");

  const reset = () => {
    setStep("idle");
    setUrl("");
    setPastedText("");
    setPayload(null);
    setFields(null);
    setIgnoreDuplicate(false);
  };

  const submitUrl = () => {
    if (!url.trim()) return;
    setStep("analyzing");
    startTransition(async () => {
      const outcome = await analyzeJobUrl(url.trim());
      if (!outcome.ok) {
        setStep("paste_fallback");
        return;
      }
      setPayload(outcome.data);
      setFields(toReviewFields(outcome.data.extracted));
      setStep("review");
    });
  };

  const submitPastedText = () => {
    if (pastedText.trim().length < 50) {
      toast.error("Collez au moins quelques phrases de la description pour permettre l'analyse.");
      return;
    }
    setStep("analyzing");
    startTransition(async () => {
      const outcome = await analyzeJobText(pastedText, url.trim() || undefined);
      if (!outcome.ok) {
        toast.error("Impossible d'analyser ce texte — essayez de coller un extrait plus complet.");
        setStep("paste_fallback");
        return;
      }
      setPayload(outcome.data);
      setFields(toReviewFields(outcome.data.extracted));
      setStep("review");
    });
  };

  const confirmSkill = (skill: string) => {
    if (!payload) return;
    startTransition(async () => {
      try {
        await addSkillToProfile(skill);
        const refreshed = await analyzeJobText(payload.extracted.rawText, url.trim() || undefined);
        if (refreshed.ok) setPayload(refreshed.data);
        toast.success(`${skill} ajouté à ton profil et compatibilité recalculée`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Impossible d'ajouter cette compétence");
      }
    });
  };

  const dismiss = () => {
    reset();
    onDismiss?.();
  };

  const updateField = <K extends keyof ReviewFields>(key: K, value: ReviewFields[K]) => {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = (action: "SAVE_LATER" | "ALREADY_APPLIED" | "PREPARE") => {
    if (!payload || !fields) return;
    if (!fields.title.trim() || !fields.companyName.trim()) {
      toast.error("Le poste et l'entreprise sont requis — complétez-les avant de sauvegarder.");
      return;
    }
    if (action === "ALREADY_APPLIED" && step !== "already_applied") {
      setStep("already_applied");
      return;
    }

    startTransition(async () => {
      try {
        const application = await saveAnalyzedOpportunity({
          action,
          title: fields.title,
          companyName: fields.companyName,
          countryName: fields.countryName || null,
          city: fields.city || null,
          remoteType: fields.remoteType || null,
          jobUrl: url.trim() || null,
          source: action === "ALREADY_APPLIED" ? source || null : "Lien d'offre",
          salaryAmount: fields.salaryAmount ? Number(fields.salaryAmount) : null,
          salaryCurrency: fields.salaryCurrency,
          durationMonths: fields.durationMonths ? Number(fields.durationMonths) : null,
          startDate: fields.startDate ? new Date(fields.startDate) : null,
          deadline: fields.deadline ? new Date(fields.deadline) : null,
          notes: (action === "ALREADY_APPLIED" ? applicationNote : fields.notes) || null,
          appliedAt: action === "ALREADY_APPLIED" ? new Date(appliedAt) : null,
          nextAction: nextAction || null,
          analysis: {
            sourceUrl: url.trim() || null,
            extractionMethod: payload.extracted.extractionMethod,
            rawExtractedText: payload.extracted.rawText,
            responsibilities: payload.extracted.responsibilities,
            qualifications: payload.extracted.qualifications,
            requiredSkills: payload.extracted.requiredSkills,
            requiredLanguages: payload.extracted.requiredLanguages,
            requiredEducationLevel: payload.extracted.requiredEducationLevel,
            requiredExperienceYears: payload.extracted.requiredExperienceYears,
            requiredStartDate: fields.startDate ? new Date(`${fields.startDate}T00:00:00Z`) : null,
            requiredEndDate: fields.endDate ? new Date(`${fields.endDate}T00:00:00Z`) : null,
            requiredDurationWeeks: payload.extracted.durationWeeks ?? (payload.extracted.durationMonths ? Math.round(payload.extracted.durationMonths * 4.345) : null),
            contractType: payload.extracted.contractType,
            matchScore: payload.match.total,
            matchBreakdown: payload.match.factors,
            strengths: payload.match.strengths,
            watchouts: payload.match.watchouts,
            missingSkills: payload.match.missingSkills,
            recommendation: payload.match.recommendation,
            eligibilityStatus: payload.eligibility.status,
            eligibilityNotes: payload.eligibility.notes,
          },
        });
        toast.success(
          action === "ALREADY_APPLIED"
            ? "Candidature enregistrée comme envoyée"
            : action === "PREPARE"
              ? "Opportunité sauvegardée — préparons la candidature"
              : "Opportunité sauvegardée",
        );
        reset();
        onDone?.(application.id);
        router.push(`/opportunities/${application.id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
      }
    });
  };

  return {
    step,
    initialMode,
    pending,
    url,
    setUrl,
    pastedText,
    setPastedText,
    payload,
    fields,
    updateField,
    ignoreDuplicate,
    setIgnoreDuplicate,
    appliedAt,
    setAppliedAt,
    source,
    setSource,
    nextAction,
    setNextAction,
    applicationNote,
    setApplicationNote,
    submitUrl,
    submitPastedText,
    confirmSkill,
    save,
    reset,
    dismiss,
    setStep,
  };
}

export type JobImportFlow = ReturnType<typeof useJobImportFlow>;
