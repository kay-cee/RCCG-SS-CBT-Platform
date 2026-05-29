"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: "MCQ" | "FITG";
  text: string;
  marks: number;
  order: number;
  options: Option[];
  savedAnswer?: { selectedOptionId?: string; textAnswer?: string } | null;
}

interface QuizInterfaceProps {
  token: string;
  questions: Question[];
  sessionId: string;
  startTime: string;
  durationMinutes: number;
  quizTitle: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function QuizInterface({
  token,
  questions,
  startTime,
  durationMinutes,
  quizTitle,
}: QuizInterfaceProps) {
  const router = useRouter();
  const totalSeconds = durationMinutes * 60;
  const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const initial = Math.max(0, totalSeconds - elapsed);

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId?: string; textAnswer?: string }>>(() => {
    const init: Record<string, { selectedOptionId?: string; textAnswer?: string }> = {};
    for (const q of questions) {
      if (q.savedAnswer?.selectedOptionId || q.savedAnswer?.textAnswer) {
        init[q.id] = {
          selectedOptionId: q.savedAnswer.selectedOptionId ?? undefined,
          textAnswer: q.savedAnswer.textAnswer ?? undefined,
        };
      }
    }
    return init;
  });
  const [timeLeft, setTimeLeft] = useState(initial);
  const [showWarning, setShowWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const unanswered = questions.filter((q) => !answers[q.id]?.selectedOptionId && !answers[q.id]?.textAnswer).length;

  const submitQuiz = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/candidate/${token}/submit`, { method: "POST" });
      if (res.ok) {
        router.push(`/quiz/${token}/result`);
      }
    } catch {
      setSubmitting(false);
    }
  }, [token, router]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      submitQuiz();
      return;
    }
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          submitQuiz();
          return 0;
        }
        if (t === 300) setShowWarning(true);
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveAnswer(questionId: string, selectedOptionId?: string, textAnswer?: string) {
    const update = { selectedOptionId, textAnswer };
    setAnswers((prev) => ({ ...prev, [questionId]: update }));
    await fetch(`/api/candidate/${token}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, selectedOptionId, textAnswer }),
    }).catch(() => {});
  }

  const q = questions[currentQ];
  const isFirst = currentQ === 0;
  const isLast = currentQ === questions.length - 1;
  const currentAnswer = answers[q.id];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-700 truncate max-w-[200px] sm:max-w-none">
            {quizTitle}
          </div>
          <div
            className={cn(
              "flex items-center gap-2 font-mono font-semibold text-lg px-3 py-1 rounded-lg",
              timeLeft <= 300 ? "bg-red-50 text-red-600" : "bg-teal-50 text-teal-700"
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* 5-min warning */}
      {showWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-700 flex items-center justify-between">
          <span>⚠️ 5 minutes remaining — please review your answers.</span>
          <button onClick={() => setShowWarning(false)} className="text-amber-500 hover:text-amber-700">×</button>
        </div>
      )}

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        {/* Question tracker */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-1.5">
            {questions.map((question, idx) => {
              const answered = !!(answers[question.id]?.selectedOptionId || answers[question.id]?.textAnswer);
              return (
                <button
                  key={question.id}
                  onClick={() => setCurrentQ(idx)}
                  className={cn(
                    "w-8 h-8 rounded-md text-xs font-medium transition-colors",
                    idx === currentQ
                      ? "ring-2 ring-teal-600 ring-offset-1"
                      : "",
                    answered
                      ? "bg-teal-600 text-white"
                      : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-teal-600" /> Answered
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-white border border-slate-300" /> Unanswered
            </span>
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-teal-600 uppercase tracking-wide">
                Question {currentQ + 1} of {questions.length}
              </span>
              <span className="text-xs text-slate-400">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
            </div>
            <p className="text-base text-slate-900 leading-relaxed">{q.text}</p>
          </div>

          <div className="p-6">
            {q.type === "MCQ" && (
              <div className="space-y-3">
                {q.options.map((opt) => {
                  const selected = currentAnswer?.selectedOptionId === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                        selected
                          ? "border-teal-600 bg-teal-50"
                          : "border-slate-200 hover:border-teal-300 hover:bg-slate-50"
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt.id}
                        checked={selected}
                        onChange={() => saveAnswer(q.id, opt.id)}
                        className="mt-0.5 accent-teal-600"
                      />
                      <span className="text-sm text-slate-800">{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === "FITG" && (
              <textarea
                className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-600 resize-none min-h-[100px]"
                placeholder="Type your answer here…"
                value={currentAnswer?.textAnswer || ""}
                onChange={(e) => saveAnswer(q.id, undefined, e.target.value)}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentQ((c) => c - 1)}
              disabled={isFirst}
            >
              ← Previous
            </Button>

            {isLast ? (
              <Button
                onClick={() => setShowConfirm(true)}
                disabled={submitting}
              >
                Submit Quiz
              </Button>
            ) : (
              <Button onClick={() => setCurrentQ((c) => c + 1)}>
                Next →
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Submit Quiz?</h2>
            <p className="text-sm text-slate-600 mb-1">
              You are about to submit your quiz. This cannot be undone.
            </p>
            {unanswered > 0 && (
              <p className="text-sm text-amber-600 font-medium mb-4">
                ⚠️ You have {unanswered} unanswered question{unanswered !== 1 ? "s" : ""}.
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                loading={submitting}
                onClick={() => { setShowConfirm(false); submitQuiz(); }}
              >
                Yes, Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
