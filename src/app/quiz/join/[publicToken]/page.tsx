// Server component — queries Prisma directly (no internal fetch) so it works
// reliably on Vercel serverless without depending on NEXT_PUBLIC_APP_URL.
import { db } from "@/lib/db";
import { JoinForm } from "./join-form";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;

  const [quiz, zones] = await Promise.all([
    db.quiz.findUnique({
      where: { publicToken },
      select: {
        id: true,
        title: true,
        description: true,
        durationMinutes: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    }),
    db.zone.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Invalid link or DRAFT quiz
  if (!quiz || quiz.status === "DRAFT") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 mb-5">
            <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Invalid Link</h1>
          <p className="text-slate-500 mt-2 text-sm">
            This invite link is not valid or has been removed. Please contact your quiz administrator.
          </p>
        </div>
      </main>
    );
  }

  // Quiz is closed
  if (quiz.status === "CLOSED") {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-5">
            <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Quiz Closed</h1>
          <p className="text-slate-500 mt-2 text-sm">
            <strong>{quiz.title}</strong> is no longer accepting registrations.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 mb-5">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-slate-500 mt-2 text-sm">{quiz.description}</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {quiz.durationMinutes} minutes
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-3">
            Fill in your details below to register and begin
          </p>
        </div>

        <JoinForm publicToken={publicToken} zones={zones} />
      </div>
    </main>
  );
}
