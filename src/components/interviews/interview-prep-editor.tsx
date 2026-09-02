"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertInterviewPrep, createQuestion, updateQuestion, deleteQuestion } from "@/lib/actions/interviews";
import { QUESTION_CATEGORIES, QUESTION_STATUSES, labelFor, colorFor } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { InterviewPrep, Question } from "@prisma/client";

function TextField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Textarea rows={2} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && startTransition(async () => onSave(v))} />
      {pending && <span className="text-xs text-subtle-foreground">Enregistrement...</span>}
    </div>
  );
}

export function InterviewPrepEditor({
  applicationId,
  prep,
}: {
  applicationId: string;
  prep: (InterviewPrep & { questions: Question[] }) | null;
}) {
  const [newQuestion, setNewQuestion] = useState("");
  const [category, setCategory] = useState("BEHAVIORAL");
  const [, startTransition] = useTransition();

  const save = (field: string) => (value: string) =>
    upsertInterviewPrep(applicationId, {
      whyCompany: prep?.whyCompany ?? "",
      whyRole: prep?.whyRole ?? "",
      whyCountry: prep?.whyCountry ?? "",
      relevantExperience: prep?.relevantExperience ?? "",
      questionsToAsk: prep?.questionsToAsk ?? "",
      weaknessesToPrep: prep?.weaknessesToPrep ?? "",
      [field]: value,
    });

  const addQuestion = () => {
    if (!newQuestion.trim()) return;
    startTransition(async () => {
      let prepId = prep?.id;
      if (!prepId) {
        const created = await upsertInterviewPrep(applicationId, {});
        prepId = created.id;
      }
      await createQuestion({ text: newQuestion, category, status: "TO_PREPARE", interviewPrepId: prepId, isBankItem: false });
      setNewQuestion("");
    });
  };

  const cycleStatus = (q: Question) => {
    const order = ["TO_PREPARE", "IN_PROGRESS", "MASTERED"];
    const next = order[(order.indexOf(q.status) + 1) % order.length];
    startTransition(async () => { await updateQuestion(q.id, { status: next }); });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Pourquoi cette entreprise ?" value={prep?.whyCompany ?? ""} onSave={save("whyCompany")} />
        <TextField label="Pourquoi ce rôle ?" value={prep?.whyRole ?? ""} onSave={save("whyRole")} />
        <TextField label="Pourquoi ce pays ?" value={prep?.whyCountry ?? ""} onSave={save("whyCountry")} />
        <TextField label="Expériences pertinentes" value={prep?.relevantExperience ?? ""} onSave={save("relevantExperience")} />
        <TextField label="Questions à poser" value={prep?.questionsToAsk ?? ""} onSave={save("questionsToAsk")} />
        <TextField label="Points faibles à préparer" value={prep?.weaknessesToPrep ?? ""} onSave={save("weaknessesToPrep")} />
      </div>

      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">Questions</h4>
        <div className="mb-3 flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Ajouter une question..." value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addQuestion()} />
          <Button size="sm" onClick={addQuestion}>
            <Plus />
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          {(prep?.questions ?? []).map((q) => (
            <div key={q.id} className="flex items-center gap-2 rounded-md border border-border p-2.5">
              <button onClick={() => cycleStatus(q)}>
                <Badge dotColor={colorFor(QUESTION_STATUSES, q.status)} className="cursor-pointer">
                  {labelFor(QUESTION_STATUSES, q.status)}
                </Badge>
              </button>
              <span className={cn("flex-1 text-sm", q.status === "MASTERED" && "text-muted-foreground")}>{q.text}</span>
              <Badge variant="outline">{labelFor(QUESTION_CATEGORIES, q.category)}</Badge>
              <button className="text-muted-foreground hover:text-danger" onClick={() => startTransition(async () => { await deleteQuestion(q.id); })}>
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          {(!prep || prep.questions.length === 0) && <p className="text-sm text-muted-foreground">Aucune question ajoutée.</p>}
        </div>
      </div>
    </div>
  );
}
