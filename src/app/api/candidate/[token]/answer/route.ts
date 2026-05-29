import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyCandidateToken } from "@/lib/auth";

// Auto-save a single answer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const payload = verifyCandidateToken(token);
  if (!payload) return Response.json({ error: "invalid_token" }, { status: 401 });

  const invite = await db.candidateInvite.findUnique({
    where: { token },
    include: { session: true },
  });

  if (!invite?.session) return Response.json({ error: "no_session" }, { status: 400 });
  if (invite.session.status === "COMPLETED") return Response.json({ error: "already_submitted" }, { status: 409 });

  const { questionId, selectedOptionId, textAnswer } = await request.json();
  if (!questionId) return Response.json({ error: "questionId required" }, { status: 400 });

  const answer = await db.answer.upsert({
    where: { sessionId_questionId: { sessionId: invite.session.id, questionId } },
    update: {
      selectedOptionId: selectedOptionId ?? null,
      textAnswer: textAnswer ?? null,
    },
    create: {
      sessionId: invite.session.id,
      questionId,
      selectedOptionId: selectedOptionId ?? null,
      textAnswer: textAnswer ?? null,
    },
  });

  return Response.json(answer);
}
