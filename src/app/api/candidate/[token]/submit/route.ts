import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyCandidateToken } from "@/lib/auth";
import { sendScoreEmail } from "@/lib/email";
import { isPassed } from "@/lib/utils";

export async function POST(
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
        include: { answers: true },
      },
      quiz: {
        include: {
          questions: {
            include: { options: true },
          },
        },
      },
    },
  });

  if (!invite?.session) return Response.json({ error: "no_session" }, { status: 400 });
  if (invite.session.status === "COMPLETED") return Response.json({ error: "already_submitted" }, { status: 409 });

  const questions = invite.quiz.questions;
  const answers = invite.session.answers;

  let totalMarks = 0;
  let score = 0;

  // Score each answer
  const answerUpdates = questions.map((q) => {
    totalMarks += q.marks;
    const answer = answers.find((a) => a.questionId === q.id);

    if (!answer) return null;

    let isCorrect = false;
    let marksAwarded = 0;

    if (q.type === "MCQ" && answer.selectedOptionId) {
      const option = q.options.find((o) => o.id === answer.selectedOptionId);
      isCorrect = option?.isCorrect ?? false;
      marksAwarded = isCorrect ? q.marks : 0;
    }
    // FITG scoring is Phase 2 — skip for now

    score += marksAwarded;

    return db.answer.update({
      where: { id: answer.id },
      data: { isCorrect, marksAwarded },
    });
  });

  await Promise.all(answerUpdates.filter(Boolean));

  const passed = isPassed(score, totalMarks, invite.quiz.passingScore);

  const updatedSession = await db.quizSession.update({
    where: { id: invite.session.id },
    data: {
      status: "COMPLETED",
      submittedAt: new Date(),
      score,
      totalMarks,
    },
  });

  // Send score email (non-blocking)
  const candidateName =
    invite.registration?.fullName || invite.name;
  sendScoreEmail({
    to: invite.email,
    candidateName,
    quizTitle: invite.quiz.title,
    score,
    totalMarks,
    passed,
    passingScore: invite.quiz.passingScore,
  }).catch(() => {});

  return Response.json({
    score,
    totalMarks,
    passed,
    sessionId: updatedSession.id,
  });
}
