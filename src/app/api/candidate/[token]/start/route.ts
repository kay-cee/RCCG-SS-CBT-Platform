import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyCandidateToken } from "@/lib/auth";

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
      session: true,
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
  if (invite.tokenExpiry < new Date()) return Response.json({ error: "expired_token" }, { status: 410 });
  if (!invite.registration) return Response.json({ error: "not_registered" }, { status: 400 });

  // If session already exists and is completed, block
  if (invite.session?.status === "COMPLETED") {
    return Response.json({ error: "already_submitted" }, { status: 409 });
  }

  // Resume existing in-progress session
  if (invite.session?.status === "IN_PROGRESS") {
    return Response.json({ sessionId: invite.session.id, resuming: true });
  }

  // Create new session
  const session = await db.quizSession.create({
    data: { inviteId: invite.id },
  });

  return Response.json({ sessionId: session.id, resuming: false }, { status: 201 });
}
