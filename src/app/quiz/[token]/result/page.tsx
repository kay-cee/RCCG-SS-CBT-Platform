import { redirect } from "next/navigation";
import { scorePercentage, isPassed } from "@/lib/utils";

async function getResult(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/candidate/${token}/result`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getResult(token);

  if (!result) redirect(`/quiz/${token}/invalid?reason=invalid_token`);

  const percentage = scorePercentage(result.score, result.totalMarks);
  const passed = isPassed(result.score, result.totalMarks, result.passingScore);

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Score card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-700 mb-1">{result.quizTitle}</h1>
          <p className="text-sm text-slate-500 mb-6">Results for {result.candidateName}</p>

          {/* Circular progress */}
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={passed === false ? "#dc2626" : "#0D9488"}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - percentage / 100)}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{percentage}%</span>
            </div>
          </div>

          <div className="text-lg text-slate-700 mb-2">
            {result.score} / {result.totalMarks} marks
          </div>

          {passed !== null && (
            <span
              className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${
                passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {passed ? "PASS" : "FAIL"}
            </span>
          )}
        </div>

        {/* Answer review */}
        {result.showAnswers && result.answers.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Answer Review</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {result.answers.map((a: {
                questionId: string;
                questionText: string;
                questionType: string;
                marks: number;
                marksAwarded: number;
                isCorrect: boolean;
                selectedOptionText: string | null;
                textAnswer: string | null;
                options: { id: string; text: string; isCorrect: boolean }[];
              }, idx: number) => (
                <div key={a.questionId} className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        a.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {a.isCorrect ? "✓" : "✗"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        {idx + 1}. {a.questionText}
                      </p>

                      {a.questionType === "MCQ" && (
                        <div className="space-y-1">
                          {a.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={cn(opt, a)}
                            >
                              {opt.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {a.questionType === "FITG" && (
                        <div className="text-sm">
                          <span className="text-slate-500">Your answer: </span>
                          <span className={a.isCorrect ? "text-green-700" : "text-red-700"}>
                            {a.textAnswer || "(no answer)"}
                          </span>
                        </div>
                      )}

                      <p className="text-xs text-slate-400 mt-1">
                        {a.marksAwarded ?? 0} / {a.marks} marks
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function cn(
  opt: { id: string; text: string; isCorrect: boolean },
  a: { selectedOptionText: string | null; isCorrect: boolean }
): string {
  const isSelected = opt.text === a.selectedOptionText;
  const base = "text-xs px-3 py-1.5 rounded-md border ";
  if (opt.isCorrect) return base + "border-green-300 bg-green-50 text-green-800";
  if (isSelected && !opt.isCorrect) return base + "border-red-300 bg-red-50 text-red-800";
  return base + "border-slate-200 text-slate-600";
}
