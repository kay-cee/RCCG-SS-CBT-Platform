import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyCandidateToken } from "@/lib/auth";

// Returns quiz questions (without revealing correct answers)
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
      session: {
        include: { answers: true },
      },
      quiz: {
        include: {
          questions: {
            include: { options: { orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!invite) return Response.json({ error: "invalid_token" }, { status: 401 });
  if (!invite.session) return Response.json({ error: "session_not_started" }, { status: 400 });
  if (invite.session.status === "COMPLETED") {
    return Response.json({ error: "already_submitted" }, { status: 409 });
  }

  const questions = invite.quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    text: q.text,
    marks: q.marks,
    order: q.order,
    options:
      q.type === "MCQ"
        ? q.options.map((o) => ({ id: o.id, text: o.text })) // hide isCorrect
        : [],
    savedAnswer: invite.session!.answers.find((a) => a.questionId === q.id) ?? null,
  }));

  return Response.json({
    questions,
    sessionId: invite.session.id,
    startTime: invite.session.startTime,
    durationMinutes: invite.quiz.durationMinutes,
  });
}
