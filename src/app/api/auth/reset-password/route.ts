import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  generateResetToken,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// POST /api/auth/reset-password — request reset
// POST /api/auth/reset-password?action=confirm — confirm reset
export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");

  if (action === "confirm") {
    const { token, password } = await request.json();
    if (!token || !password) {
      return Response.json({ error: "Token and password required" }, { status: 400 });
    }

    const record = await db.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.used || record.expiresAt < new Date()) {
      return Response.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    await db.$transaction([
      db.admin.update({
        where: { email: record.email },
        data: { passwordHash: hashed },
      }),
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
    ]);

    return Response.json({ success: true });
  }

  // Request reset
  const { email } = await request.json();
  if (!email) {
    return Response.json({ error: "Email required" }, { status: 400 });
  }

  const admin = await db.admin.findUnique({ where: { email } });
  // Always return 200 to avoid email enumeration
  if (admin) {
    const token = generateResetToken();
    await db.passwordResetToken.create({
      data: {
        email,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });
    await sendPasswordResetEmail({
      to: email,
      resetUrl: `${APP_URL}/admin/reset-password?token=${token}`,
    });
  }

  return Response.json({ success: true });
}
