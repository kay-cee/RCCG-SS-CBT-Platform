import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyCandidateToken } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const payload = verifyCandidateToken(token);
  if (!payload) return Response.json({ error: "invalid_token" }, { status: 401 });

  const invite = await db.candidateInvite.findUnique({
    where: { token },
    include: {
      registration: true,
      session: {
        include: {
          answers: {
            include: {
              question: { include: { options: { orderBy: { order: "asc" } } } },
              selectedOption: true,
            },
            orderBy: { question: { order: "asc" } },
          },
        },
      },
      quiz: {
        select: {
          title: true,
          passingScore: true,
          showAnswers: true,
        },
      },
    },
  });

  if (!invite?.session) return Response.json({ error: "no_session" }, { status: 404 });
  if (invite.session.status !== "COMPLETED") {
    return Response.json({ error: "not_submitted" }, { status: 400 });
  }

  const { session, quiz, registration, name } = invite;

  return Response.json({
    candidateName: registration?.fullName || name,
    quizTitle: quiz.title,
    score: session.score,
    totalMarks: session.totalMarks,
    passingScore: quiz.passingScore,
    submittedAt: session.submittedAt,
    showAnswers: quiz.showAnswers,
    answers: quiz.showAnswers
      ? session.answers.map((a) => ({
          questionId: a.questionId,
          questionText: a.question.text,
          questionType: a.question.type,
          marks: a.question.marks,
          marksAwarded: a.marksAwarded,
          isCorrect: a.isCorrect,
          selectedOptionId: a.selectedOptionId,
          selectedOptionText: a.selectedOption?.text ?? null,
          textAnswer: a.textAnswer,
          options: a.question.options.map((o) => ({
            id: o.id,
            text: o.text,
            isCorrect: o.isCorrect,
          })),
        }))
      : [],
  });
}
