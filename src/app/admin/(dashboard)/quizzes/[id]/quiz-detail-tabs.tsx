"use client";

import { useState, useEffect } from "react";
import { cn, scorePercentage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QuestionManager } from "@/components/admin/question-manager";
import { InviteManager } from "@/components/admin/invite-manager";
import { ZoneBarChart } from "@/components/admin/zone-bar-chart";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface Question {
  id: string;
  type: "MCQ" | "FITG";
  text: string;
  marks: number;
  order: number;
  options: Option[];
}

interface Invite {
  id: string;
  email: string;
  name: string;
  zone: string;
  token: string;
  inviteStatus: string;
  sentAt: Date | string | null;
  registration: { fullName: string; phone: string } | null;
  session: {
    score: number | null;
    totalMarks: number | null;
    status: string;
    startTime: Date | string;
    submittedAt: Date | string | null;
  } | null;
}

interface QuizDetailTabsProps {
  quiz: {
    id: string;
    title: string;
    passingScore: number | null;
    showAnswers: boolean;
    publicToken: string | null;
    questions: Question[];
    invites: Invite[];
  };
}

const TABS = ["Questions", "Candidates", "Results", "Analytics", "Question Bank"];

export function QuizDetailTabs({ quiz }: QuizDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("Questions");

  return (
    <div>
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
              activeTab === tab
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Questions" && (
        <QuestionManager quizId={quiz.id} initialQuestions={quiz.questions} />
      )}

      {activeTab === "Candidates" && (
        <div className="space-y-6">
          <UniversalLinkPanel quizId={quiz.id} initialToken={quiz.publicToken} />
          <InviteManager quizId={quiz.id} invites={quiz.invites} />
        </div>
      )}

      {activeTab === "Results" && (
        <ResultsTab quiz={quiz} />
      )}

      {activeTab === "Analytics" && (
        <AnalyticsTab quizId={quiz.id} passingScore={quiz.passingScore} />
      )}

      {activeTab === "Question Bank" && (
        <QuestionBankTab quizId={quiz.id} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Universal link panel — shareable self-registration link for a quiz
// ---------------------------------------------------------------------------
function UniversalLinkPanel({
  quizId,
  initialToken,
}: {
  quizId: string;
  initialToken: string | null;
}) {
  const [publicToken, setPublicToken] = useState<string | null>(initialToken);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  const joinUrl = publicToken ? `${appUrl}/quiz/join/${publicToken}` : null;

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/quiz/${quizId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regeneratePublicToken" }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setPublicToken(data.publicToken);
    } catch {
      setError("Failed to generate link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text manually
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Universal Invite Link</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Share this link so candidates can register and take the quiz on their own — no email invite needed.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-shrink-0 text-xs font-medium text-slate-600 border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {loading ? "Generating…" : publicToken ? "Regenerate" : "Generate Link"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 mb-3">{error}</p>
      )}

      {joinUrl ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-mono truncate">
            {joinUrl}
          </div>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors"
            style={
              copied
                ? { borderColor: "#0d9488", color: "#0f766e", backgroundColor: "#f0fdfa" }
                : { borderColor: "#cbd5e1", color: "#475569", backgroundColor: "white" }
            }
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">
          No link generated yet. Click "Generate Link" to create one.
        </p>
      )}

      {publicToken && (
        <p className="text-xs text-amber-600 mt-2">
          ⚠ Regenerating creates a new link — the old one will stop working immediately.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results tab — "All Results" table + "Leaderboard" sub-tabs
// ---------------------------------------------------------------------------

/** Convert start/end timestamps into a human-readable "Xm Ys" duration. */
function formatCompletionTime(
  startTime: Date | string,
  submittedAt: Date | string
): string {
  const ms =
    new Date(submittedAt).getTime() - new Date(startTime).getTime();
  if (ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function ResultsTab({
  quiz,
}: {
  quiz: QuizDetailTabsProps["quiz"];
}) {
  const [subTab, setSubTab] = useState<"results" | "leaderboard">("results");

  const completed = quiz.invites.filter((i) => i.session?.status === "COMPLETED");

  // Leaderboard: rank by score desc, then by fastest completion time asc.
  // Only include rows where submittedAt is known (needed for completion time).
  const leaderboard = [...completed]
    .filter((i) => i.session?.submittedAt != null)
    .sort((a, b) => {
      const pctA = scorePercentage(a.session!.score ?? 0, a.session!.totalMarks ?? 1);
      const pctB = scorePercentage(b.session!.score ?? 0, b.session!.totalMarks ?? 1);
      if (pctB !== pctA) return pctB - pctA; // higher score first
      // Tie-break: fastest (smallest elapsed ms) wins
      const msA =
        new Date(a.session!.submittedAt!).getTime() -
        new Date(a.session!.startTime).getTime();
      const msB =
        new Date(b.session!.submittedAt!).getTime() -
        new Date(b.session!.startTime).getTime();
      return msA - msB;
    });

  return (
    <div className="space-y-4">
      {/* Sub-tab bar */}
      <div className="flex gap-0 border-b border-slate-200">
        {(["results", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              subTab === t
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t === "results" ? "All Results" : "Leaderboard"}
          </button>
        ))}
      </div>

      {/* ── All Results ── */}
      {subTab === "results" && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {completed.length} submission{completed.length !== 1 ? "s" : ""}
            </p>
            {completed.length > 0 && (
              <a
                href={`/api/quiz/${quiz.id}/export`}
                download
                className="inline-flex items-center gap-1.5 border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export CSV
              </a>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {completed.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No submissions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Name", "Zone", "Score", "Pass/Fail", "Submitted"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {completed.map((invite) => {
                      const s = invite.session!;
                      const pct = scorePercentage(s.score!, s.totalMarks!);
                      const passed = quiz.passingScore != null ? pct >= quiz.passingScore : null;
                      return (
                        <tr key={invite.id}>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {invite.registration?.fullName || invite.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{invite.zone}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {s.score}/{s.totalMarks} ({pct}%)
                          </td>
                          <td className="px-4 py-3">
                            {passed !== null ? (
                              <Badge variant={passed ? "success" : "error"}>
                                {passed ? "PASS" : "FAIL"}
                              </Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs">
                            {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Leaderboard ── */}
      {subTab === "leaderboard" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Ranked by highest score, then by fastest completion time.
          </p>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {leaderboard.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No submissions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Rank", "Name", "Zone", "Score", "Time"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaderboard.map((invite, idx) => {
                      const s = invite.session!;
                      const pct = scorePercentage(s.score ?? 0, s.totalMarks ?? 1);
                      const rank = idx + 1;
                      const medal =
                        rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                      return (
                        <tr
                          key={invite.id}
                          className={cn(
                            rank === 1 && "bg-amber-50",
                            rank === 2 && "bg-slate-50",
                            rank === 3 && "bg-orange-50/50"
                          )}
                        >
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {medal ? (
                              <span className="text-lg">{medal}</span>
                            ) : (
                              <span className="text-slate-400">#{rank}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">
                            {invite.registration?.fullName || invite.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{invite.zone}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {s.score}/{s.totalMarks}{" "}
                            <span className="font-normal text-slate-500">({pct}%)</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                            {formatCompletionTime(s.startTime, s.submittedAt!)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Analytics tab — fetches lazily when tab becomes active
// ---------------------------------------------------------------------------
function AnalyticsTab({
  quizId,
  passingScore,
}: {
  quizId: string;
  passingScore: number | null;
}) {
  const [data, setData] = useState<{
    zones: Array<{ zone: string; count: number; avgPercentage: number; passCount: number; passRate: number | null }>;
    overall: { totalSubmissions: number; avgPercentage: number; passRate: number | null } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/quiz/${quizId}/analytics`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Failed to load analytics."); setLoading(false); });
  }, [quizId]);

  if (loading) return <div className="py-16 text-center text-slate-400 text-sm">Loading analytics…</div>;
  if (error) return <div className="py-8 text-center text-red-500 text-sm">{error}</div>;
  if (!data) return null;

  return (
    <ZoneBarChart
      zones={data.zones}
      overall={data.overall}
      passingScore={passingScore}
    />
  );
}

// ---------------------------------------------------------------------------
// Question Bank tab — browse bank, copy to this quiz; archive from this quiz
// ---------------------------------------------------------------------------
interface BankQuestion {
  id: string;
  type: "MCQ" | "FITG";
  text: string;
  marks: number;
  options: Array<{ id: string; text: string; isCorrect: boolean; order: number }>;
}

function QuestionBankTab({ quizId }: { quizId: string }) {
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copying, setCopying] = useState<string | null>(null);
  const [copied, setCopied] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/question-bank")
      .then((r) => r.json())
      .then((d) => { setBankQuestions(d); setLoading(false); })
      .catch(() => { setError("Failed to load question bank."); setLoading(false); });
  }, []);

  async function copyToQuiz(questionId: string) {
    setCopying(questionId);
    try {
      const res = await fetch(`/api/question-bank/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "copy", quizId }),
      });
      if (res.ok) {
        setCopied((prev) => new Set(prev).add(questionId));
        setMsg("Question added to this quiz. Save questions to apply.");
      } else {
        setMsg("Failed to copy question.");
      }
    } finally {
      setCopying(null);
    }
  }

  if (loading) return <div className="py-16 text-center text-slate-400 text-sm">Loading question bank…</div>;
  if (error) return <div className="py-8 text-center text-red-500 text-sm">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Question Bank</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {bankQuestions.length} question{bankQuestions.length !== 1 ? "s" : ""} available.
            Click "Add to Quiz" to copy a question into this quiz.
          </p>
        </div>
      </div>

      {msg && (
        <p className={`text-sm ${msg.includes("Failed") ? "text-red-600" : "text-teal-700"}`}>
          {msg}
        </p>
      )}

      {bankQuestions.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center text-slate-400">
          <p className="text-sm">The question bank is empty.</p>
          <p className="text-xs mt-1">
            Use the "Archive to Bank" button on individual questions (in the Questions tab)
            to move them here, or upload a PDF with "Save to Bank" enabled.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bankQuestions.map((q, idx) => (
            <div
              key={q.id}
              className={cn(
                "bg-white border rounded-xl p-4",
                copied.has(q.id) ? "border-teal-200 bg-teal-50/30" : "border-slate-200"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400">#{idx + 1}</span>
                    <Badge variant={q.type === "MCQ" ? "info" : "default"}>
                      {q.type}
                    </Badge>
                    <span className="text-xs text-slate-400">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                  </div>
                  <p className="text-sm text-slate-800 leading-snug">{q.text}</p>
                  {q.type === "MCQ" && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.options.map((opt) => (
                        <span
                          key={opt.id}
                          className={cn(
                            "text-xs px-2 py-0.5 rounded",
                            opt.isCorrect
                              ? "bg-teal-100 text-teal-800 font-medium"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {opt.isCorrect ? "✓ " : ""}{opt.text}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.type === "FITG" && q.options[0] && (
                    <p className="text-xs text-teal-700 mt-1">Answer: {q.options[0].text}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={copied.has(q.id) ? "outline" : "primary"}
                  onClick={() => copyToQuiz(q.id)}
                  disabled={copying === q.id}
                  className="flex-shrink-0"
                >
                  {copying === q.id ? "Adding…" : copied.has(q.id) ? "Added ✓" : "Add to Quiz"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
