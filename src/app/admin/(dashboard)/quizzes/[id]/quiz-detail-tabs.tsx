"use client";

import { useState } from "react";
import { cn, scorePercentage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { QuestionManager } from "@/components/admin/question-manager";
import { InviteManager } from "@/components/admin/invite-manager";

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
    questions: Question[];
    invites: Invite[];
  };
}

const tabs = ["Questions", "Candidates", "Results"];

export function QuizDetailTabs({ quiz }: QuizDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("Questions");

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div>
      <div className="flex border-b border-slate-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
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
        <InviteManager quizId={quiz.id} invites={quiz.invites} />
      )}

      {activeTab === "Results" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {quiz.invites.filter((i) => i.session?.status === "COMPLETED").length === 0 ? (
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
                  {quiz.invites
                    .filter((i) => i.session?.status === "COMPLETED")
                    .map((invite) => {
                      const s = invite.session!;
                      const pct = scorePercentage(s.score!, s.totalMarks!);
                      const passed =
                        quiz.passingScore != null ? pct >= quiz.passingScore : null;
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
      )}
    </div>
  );
}
