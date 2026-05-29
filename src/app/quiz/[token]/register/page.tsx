import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCandidateInvite } from "@/lib/candidate-data";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, zones] = await Promise.all([
    getCandidateInvite(token),
    db.zone.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!invite) redirect(`/quiz/${token}/invalid?reason=invalid_token`);
  if (invite.session?.status === "COMPLETED") redirect(`/quiz/${token}/result`);
  if (invite.registered) redirect(`/quiz/${token}/start`);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-teal-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{invite.quiz.title}</h1>
          <p className="text-slate-500 mt-1">Please complete your registration to begin</p>
        </div>
        <RegisterForm token={token} invite={invite} zones={zones} />
      </div>
    </main>
  );
}
