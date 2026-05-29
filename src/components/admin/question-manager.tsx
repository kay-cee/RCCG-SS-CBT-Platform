"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Option {
  id?: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface Question {
  id?: string;
  type: "MCQ" | "FITG";
  text: string;
  marks: number;
  order: number;
  options: Option[];
}

interface QuestionManagerProps {
  quizId: string;
  initialQuestions: Question[];
}

export function QuestionManager({ quizId, initialQuestions }: QuestionManagerProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [pdfParsing, setPdfParsing] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        type: "MCQ",
        text: "",
        marks: 1,
        order: prev.length,
        options: [
          { text: "", isCorrect: true, order: 0 },
          { text: "", isCorrect: false, order: 1 },
        ],
      },
    ]);
  }

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i })));
  }

  function updateQuestion(idx: number, update: Partial<Question>) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...update } : q)));
  }

  function addOption(qIdx: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        return {
          ...q,
          options: [...q.options, { text: "", isCorrect: false, order: q.options.length }],
        };
      })
    );
  }

  function updateOption(qIdx: number, oIdx: number, update: Partial<Option>) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = q.options.map((o, j) => {
          if (j !== oIdx) return o;
          return { ...o, ...update };
        });
        // If marking as correct, unmark others (single-choice)
        if (update.isCorrect) {
          return { ...q, options: newOpts.map((o, j) => ({ ...o, isCorrect: j === oIdx })) };
        }
        return { ...q, options: newOpts };
      })
    );
  }

  function removeOption(qIdx: number, oIdx: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const newOpts = q.options
          .filter((_, j) => j !== oIdx)
          .map((o, j) => ({ ...o, order: j }));
        return { ...q, options: newOpts };
      })
    );
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(`/api/quiz/${quizId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questions),
      });
      if (!res.ok) {
        setSaveMsg("Failed to save questions.");
        return;
      }
      const saved = await res.json();
      setQuestions(saved);
      setSaveMsg("Questions saved successfully.");
    } catch {
      setSaveMsg("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfParsing(true);
    setPdfError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/quiz/${quizId}/parse-pdf`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        setPdfError("Failed to parse PDF. Please check the file format.");
        return;
      }
      const parsed: Question[] = await res.json();
      setQuestions((prev) => [
        ...prev,
        ...parsed.map((q, i) => ({ ...q, order: prev.length + i })),
      ]);
    } catch {
      setPdfError("Network error parsing PDF.");
    } finally {
      setPdfParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <Button onClick={addQuestion} variant="outline" size="sm">
            + Add Question
          </Button>
          <label className="cursor-pointer">
            <span
              className={cn(
                "inline-flex items-center text-sm font-medium border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors",
                pdfParsing && "opacity-50 pointer-events-none"
              )}
            >
              {pdfParsing ? "Parsing PDF…" : "Upload PDF"}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />
          </label>
        </div>
        <Button onClick={handleSave} loading={saving} size="sm">
          Save Questions
        </Button>
      </div>

      {pdfError && <p className="text-sm text-red-600">{pdfError}</p>}
      {saveMsg && (
        <p className={`text-sm ${saveMsg.includes("success") ? "text-green-600" : "text-red-600"}`}>
          {saveMsg}
        </p>
      )}

      {questions.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-400">
          <p>No questions yet. Add one manually or upload a PDF.</p>
        </div>
      )}

      {questions.map((q, qIdx) => (
        <div key={qIdx} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">Q{qIdx + 1}</span>

            <select
              value={q.type}
              onChange={(e) => updateQuestion(qIdx, { type: e.target.value as "MCQ" | "FITG", options: e.target.value === "MCQ" ? (q.options.length ? q.options : [{ text: "", isCorrect: true, order: 0 }, { text: "", isCorrect: false, order: 1 }]) : [] })}
              className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600"
            >
              <option value="MCQ">MCQ</option>
              <option value="FITG">Fill-in-the-Gap</option>
            </select>

            <input
              type="number"
              min={0.5}
              step={0.5}
              value={q.marks}
              onChange={(e) => updateQuestion(qIdx, { marks: Number(e.target.value) })}
              className="w-16 text-xs border border-slate-200 rounded px-2 py-1 text-slate-600"
              title="Marks"
            />
            <span className="text-xs text-slate-400">marks</span>

            <button
              onClick={() => removeQuestion(qIdx)}
              className="ml-auto text-slate-400 hover:text-red-500 text-xs"
            >
              Remove
            </button>
          </div>

          <textarea
            className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none min-h-[80px]"
            placeholder="Question text"
            value={q.text}
            onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
          />

          {q.type === "MCQ" && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-slate-500">Options (select correct answer)</div>
              {q.options.map((opt, oIdx) => (
                <div key={oIdx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`q${qIdx}-correct`}
                    checked={opt.isCorrect}
                    onChange={() => updateOption(qIdx, oIdx, { isCorrect: true })}
                    className="accent-teal-600"
                    title="Mark as correct"
                  />
                  <input
                    type="text"
                    className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                    value={opt.text}
                    onChange={(e) => updateOption(qIdx, oIdx, { text: e.target.value })}
                  />
                  {q.options.length > 2 && (
                    <button
                      onClick={() => removeOption(qIdx, oIdx)}
                      className="text-slate-300 hover:text-red-400 text-sm"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {q.options.length < 5 && (
                <button
                  onClick={() => addOption(qIdx)}
                  className="text-xs text-teal-600 hover:text-teal-700"
                >
                  + Add option
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {questions.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            Save All Questions
          </Button>
        </div>
      )}
    </div>
  );
}
