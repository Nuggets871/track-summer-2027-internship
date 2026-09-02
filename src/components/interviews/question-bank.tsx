"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createQuestion, updateQuestion, deleteQuestion } from "@/lib/actions/interviews";
import { QUESTION_CATEGORIES, QUESTION_STATUSES, labelFor, colorFor } from "@/lib/constants";
import type { Question } from "@prisma/client";

export function QuestionBank({ questions }: { questions: Question[] }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("BEHAVIORAL");
  const [, startTransition] = useTransition();

  const add = () => {
    if (!text.trim()) return;
    startTransition(async () => {
      await createQuestion({ text, category, status: "TO_PREPARE", isBankItem: true });
      setText("");
    });
  };

  const cycleStatus = (q: Question) => {
    const order = ["TO_PREPARE", "IN_PROGRESS", "MASTERED"];
    const next = order[(order.indexOf(q.status) + 1) % order.length];
    startTransition(async () => { await updateQuestion(q.id, { status: next }); });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
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
        <Input placeholder="Ajouter une question à la banque..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button size="sm" onClick={add}>
          <Plus />
        </Button>
      </div>
      <div className="flex flex-col gap-1.5">
        {questions.map((q) => (
          <div key={q.id} className="flex items-center gap-2 rounded-md border border-border p-2.5">
            <button onClick={() => cycleStatus(q)}>
              <Badge dotColor={colorFor(QUESTION_STATUSES, q.status)} className="cursor-pointer">
                {labelFor(QUESTION_STATUSES, q.status)}
              </Badge>
            </button>
            <span className="flex-1 text-sm text-foreground">{q.text}</span>
            <Badge variant="outline">{labelFor(QUESTION_CATEGORIES, q.category)}</Badge>
            <button className="text-muted-foreground hover:text-danger" onClick={() => startTransition(async () => { await deleteQuestion(q.id); })}>
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {questions.length === 0 && <p className="text-sm text-muted-foreground">Aucune question dans la banque.</p>}
      </div>
    </div>
  );
}
