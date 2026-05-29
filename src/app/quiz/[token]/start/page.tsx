import { redirect } from "next/navigation";
import { getCandidateInvite } from "@/lib/candidate-data";
import { StartQuizButton } from "./start-button";
import { formatDuration } from "@/lib/utils";

export default async function StartPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getCandidateInvite(token);

  if (!invite) redirect(`/quiz/${token}/invalid?reason=invalid_token`);
  if (!invite.registered) redirect(`/quiz/${token}/register`);
  if (invite.session?.status === "COMPLETED") redirect(`/quiz/${token}/result`);

  const quiz = invite.quiz;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-teal-600 px-6 py-8 text-white text-center">
          <h1 className="text-2xl font-bold">{quiz.title}</h1>
          {quiz.description && <p className="mt-2 text-teal-100">{quiz.description}</p>}
        </div>

        <div className="p-6 space-y-4">
          {quiz.instructions && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Instructions</h2>
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap">
                {quiz.instructions}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-teal-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-teal-700">
                {formatDuration(quiz.durationMinutes)}
              </div>
              <div className="text-xs text-teal-600 mt-0.5">Time limit</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-700">
                {invite.session?.status === "IN_PROGRESS" ? "Resume" : "Ready"}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {invite.session?.status === "IN_PROGRESS" ? "Quiz in progress" : "Start when ready"}
              </div>
            </div>
          </div>

          <StartQuizButton token={token} resuming={invite.session?.status === "IN_PROGRESS"} />
        </div>
      </div>
    </main>
  );
}
