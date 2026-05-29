import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { signCandidateToken } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: quizId } = await params;
  const quiz = await db.quiz.findFirst({ where: { id: quizId, adminId: session.adminId } });
  if (!quiz) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  // candidates: [{ name, email, zone }]
  // sendNow: boolean (default true)
  const { candidates, sendNow = true } = body;

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return Response.json({ error: "Candidates array required" }, { status: 400 });
  }

  // Token validity: use quiz endDate or 30 days from now
  const tokenExpiry = quiz.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const results: {
    email: string;
    status: "created" | "duplicate" | "error";
    inviteId?: string;
    token?: string;
  }[] = [];

  for (const candidate of candidates) {
    const { name, email, zone } = candidate;
    if (!name || !email || !zone) {
      results.push({ email: email || "", status: "error" });
      continue;
    }

    // Check for existing invite
    const existing = await db.candidateInvite.findFirst({
      where: { quizId, email },
    });
    if (existing) {
      results.push({ email, status: "duplicate", inviteId: existing.id, token: existing.token });
      continue;
    }

    const token = signCandidateToken(
      { inviteId: "", quizId, email },
      tokenExpiry
    );

    const invite = await db.candidateInvite.create({
      data: {
        quizId,
        email,
        name,
        zone,
        token,
        tokenExpiry,
        inviteStatus: "PENDING",
      },
    });

    // Re-sign token with actual inviteId
    const finalToken = signCandidateToken(
      { inviteId: invite.id, quizId, email },
      tokenExpiry
    );
    await db.candidateInvite.update({
      where: { id: invite.id },
      data: { token: finalToken },
    });

    if (sendNow) {
      try {
        await sendInviteEmail({
          to: email,
          candidateName: name,
          quizTitle: quiz.title,
          quizDescription: quiz.description,
          token: finalToken,
          startDate: quiz.startDate,
        });
        await db.candidateInvite.update({
          where: { id: invite.id },
          data: { inviteStatus: "SENT", sentAt: new Date() },
        });
        results.push({ email, status: "created", inviteId: invite.id, token: finalToken });
      } catch {
        await db.candidateInvite.update({
          where: { id: invite.id },
          data: { inviteStatus: "FAILED" },
        });
        results.push({ email, status: "error" });
      }
    } else {
      results.push({ email, status: "created", inviteId: invite.id, token: finalToken });
    }
  }

  return Response.json(results, { status: 201 });
}

// Resend invite
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: quizId } = await params;
  const { inviteId } = await request.json();

  const invite = await db.candidateInvite.findFirst({
    where: { id: inviteId, quizId },
    include: { quiz: true },
  });
  if (!invite) return Response.json({ error: "Not found" }, { status: 404 });

  await sendInviteEmail({
    to: invite.email,
    candidateName: invite.name,
    quizTitle: invite.quiz.title,
    quizDescription: invite.quiz.description,
    token: invite.token,
    startDate: invite.quiz.startDate,
  });

  await db.candidateInvite.update({
    where: { id: inviteId },
    data: { inviteStatus: "SENT", sentAt: new Date() },
  });

  return Response.json({ success: true });
}
