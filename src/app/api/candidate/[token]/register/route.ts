import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyCandidateToken } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const payload = verifyCandidateToken(token);
  if (!payload) {
    return Response.json({ error: "invalid_token" }, { status: 401 });
  }

  const invite = await db.candidateInvite.findUnique({
    where: { token },
    include: { registration: true },
  });
  if (!invite) return Response.json({ error: "invalid_token" }, { status: 401 });
  if (invite.tokenExpiry < new Date()) return Response.json({ error: "expired_token" }, { status: 410 });
  if (invite.registration) return Response.json({ error: "already_registered" }, { status: 409 });

  const { fullName, phone, zone } = await request.json();

  if (!fullName || !phone || !zone) {
    return Response.json({ error: "All fields are required" }, { status: 400 });
  }

  if (fullName.length < 2 || !/^[a-zA-Z\s'-]+$/.test(fullName)) {
    return Response.json({ error: "Invalid full name" }, { status: 400 });
  }

  const registration = await db.candidateRegistration.create({
    data: {
      inviteId: invite.id,
      fullName,
      email: invite.email,
      phone,
      zone,
    },
  });

  return Response.json(registration, { status: 201 });
}
