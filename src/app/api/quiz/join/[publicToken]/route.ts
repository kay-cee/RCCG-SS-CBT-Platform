import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { signCandidateToken } from "@/lib/auth";

// Public — no admin auth required.
// Returns just enough quiz info for the self-registration landing page.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  const { publicToken } = await params;

  const quiz = await db.quiz.findUnique({
    where: { publicToken },
    select: {
      id: true,
      title: true,
      description: true,
      durationMinutes: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  });

  if (!quiz) return Response.json({ error: "not_found" }, { status: 404 });
  if (quiz.status === "DRAFT") return Response.json({ error: "not_available" }, { status: 403 });

  return Response.json(quiz);
}

// Self-registration: candidate submits their details, gets a personal token back.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  const { publicToken } = await params;

  const quiz = await db.quiz.findUnique({
    where: { publicToken },
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!quiz) return Response.json({ error: "not_found" }, { status: 404 });
  if (quiz.status !== "ACTIVE") {
    return Response.json({ error: "quiz_not_active" }, { status: 403 });
  }

  const now = new Date();
  if (quiz.endDate && quiz.endDate < now) {
    return Response.json({ error: "quiz_closed" }, { status: 403 });
  }

  const body = await request.json();
  const { fullName, email, phone, zone } = body as {
    fullName: string;
    email: string;
    phone: string;
    zone: string;
  };

  if (!fullName || !email || !phone || !zone) {
    return Response.json({ error: "All fields are required" }, { status: 400 });
  }
  if (fullName.trim().length < 2 || !/^[a-zA-Z\s'-]+$/.test(fullName.trim())) {
    return Response.json({ error: "Invalid full name" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return Response.json({ error: "Invalid email address" }, { status: 400 });
  }

  const normalEmail = email.trim().toLowerCase();

  // Duplicate check — same email can't register for the same quiz twice
  const existing = await db.candidateInvite.findFirst({
    where: { quizId: quiz.id, email: normalEmail },
  });
  if (existing) {
    return Response.json({ error: "already_registered" }, { status: 409 });
  }

  const tokenExpiry = quiz.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Create invite with a placeholder token so we get the DB-generated id
  const placeholder = signCandidateToken(
    { inviteId: "", quizId: quiz.id, email: normalEmail },
    tokenExpiry
  );

  const invite = await db.candidateInvite.create({
    data: {
      quizId: quiz.id,
      email: normalEmail,
      name: fullName.trim(),
      zone,
      token: placeholder,
      tokenExpiry,
      inviteStatus: "OPENED",
    },
  });

  // Re-sign with the real inviteId
  const finalToken = signCandidateToken(
    { inviteId: invite.id, quizId: quiz.id, email: normalEmail },
    tokenExpiry
  );

  // Update token + create registration atomically
  await db.$transaction([
    db.candidateInvite.update({
      where: { id: invite.id },
      data: { token: finalToken },
    }),
    db.candidateRegistration.create({
      data: {
        inviteId: invite.id,
        fullName: fullName.trim(),
        email: normalEmail,
        phone: phone.trim(),
        zone,
      },
    }),
  ]);

  return Response.json({ token: finalToken }, { status: 201 });
}
