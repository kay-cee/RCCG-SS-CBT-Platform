import { redirect } from "next/navigation";
import { QuizInterface } from "./quiz-interface";

async function getQuizData(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/candidate/${token}/questions`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function getInviteData(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/candidate/${token}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function TakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, quizData] = await Promise.all([
    getInviteData(token),
    getQuizData(token),
  ]);

  if (!invite) redirect(`/quiz/${token}/invalid?reason=invalid_token`);
  if (!invite.session) redirect(`/quiz/${token}/start`);
  if (invite.session.status === "COMPLETED") redirect(`/quiz/${token}/result`);
  if (!quizData) redirect(`/quiz/${token}/start`);

  return (
    <QuizInterface
      token={token}
      questions={quizData.questions}
      sessionId={quizData.sessionId}
      startTime={quizData.startTime}
      durationMinutes={quizData.durationMinutes}
      quizTitle={invite.quiz.title}
    />
  );
}
