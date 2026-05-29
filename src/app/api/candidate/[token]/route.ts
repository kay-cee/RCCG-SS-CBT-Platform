import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyCandidateToken } from "@/lib/auth";

// Validate token and return invite/quiz info
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const payload = verifyCandidateToken(token);
  if (!payload) {
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }

  const invite = await db.candidateInvite.findUnique({
    where: { token },
    include: {
      quiz: { select: { id: true, title: true, description: true, instructions: true, durationMinutes: true, startDate: true, endDate: true, status: true } },
      registration: true,
      session: { select: { id: true, status: true, startTime: true } },
    },
  });

  if (!invite) {
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }

  if (invite.tokenExpiry < new Date()) {
    return Response.json({ error: "expired_token" }, { status: 410 });
  }

  // Mark as opened if first visit
  if (invite.inviteStatus === "SENT") {
    await db.candidateInvite.update({
      where: { id: invite.id },
      data: { inviteStatus: "OPENED" },
    });
  }

  return Response.json({
    inviteId: invite.id,
    name: invite.name,
    email: invite.email,
    zone: invite.zone,
    quiz: invite.quiz,
    registered: !!invite.registration,
    session: invite.session,
  });
}
