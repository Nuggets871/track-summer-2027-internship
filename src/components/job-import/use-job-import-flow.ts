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
    deadline: extracted.deadline ?? "",
    notes: "",
  };
}

export function useJobImportFlow(onDone?: (applicationId: string) => void) {
  const router = useRouter();
  const [step, setStep] = useState<FlowStep>("idle");
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [payload, setPayload] = useState<JobAnalysisPayload | null>(null);
  const [fields, setFields] = useState<ReviewFields | null>(null);
  const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

  // "already applied" extra fields
  const [appliedAt, setAppliedAt] = useState(new Date().toISOString().slice(0, 10));
  const [cvDocumentId, setCvDocumentId] = useState("");
  const [coverLetterDocumentId, setCoverLetterDocumentId] = useState("");
  const [source, setSource] = useState("");
  const [nextAction, setNextAction] = useState("");

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
          notes: fields.notes || null,
          appliedAt: action === "ALREADY_APPLIED" ? new Date(appliedAt) : null,
          cvDocumentId: cvDocumentId || null,
          coverLetterDocumentId: coverLetterDocumentId || null,
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
        if (action === "PREPARE") router.push(`/applications/${application.id}?tab=preparation`);
        else router.push(`/applications/${application.id}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Une erreur est survenue");
      }
    });
  };

  return {
    step,
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
    cvDocumentId,
    setCvDocumentId,
    coverLetterDocumentId,
    setCoverLetterDocumentId,
    source,
    setSource,
    nextAction,
    setNextAction,
    submitUrl,
    submitPastedText,
    save,
    reset,
    setStep,
  };
}

export type JobImportFlow = ReturnType<typeof useJobImportFlow>;
