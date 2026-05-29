import { redirect } from "next/navigation";
import { getCandidateInvite, getCandidateQuestions } from "@/lib/candidate-data";
import { QuizInterface } from "./quiz-interface";

export default async function TakePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, quizData] = await Promise.all([
    getCandidateInvite(token),
    getCandidateQuestions(token),
  ]);

  if (!invite) redirect(`/quiz/${token}/invalid?reason=invalid_token`);
  if (!invite.session) redirect(`/quiz/${token}/start`);
  if (invite.session.status === "COMPLETED") redirect(`/quiz/${token}/result`);
  if (!quizData) redirect(`/quiz/${token}/start`);

  // Coerce DB types to the shape QuizInterface expects
  const questions = quizData.questions.map((q) => ({
    ...q,
    type: q.type as "MCQ" | "FITG",
    savedAnswer: q.savedAnswer
      ? {
          selectedOptionId: q.savedAnswer.selectedOptionId ?? undefined,
          textAnswer: q.savedAnswer.textAnswer ?? undefined,
        }
      : null,
  }));

  return (
    <QuizInterface
      token={token}
      questions={questions}
      sessionId={quizData.sessionId}
      startTime={quizData.startTime instanceof Date ? quizData.startTime.toISOString() : quizData.startTime}
      durationMinutes={quizData.durationMinutes}
      quizTitle={invite.quiz.title}
    />
  );
}
