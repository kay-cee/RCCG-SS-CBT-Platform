import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  verifyPassword,
  signAdminSession,
  makeAdminCookie,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return Response.json(
      { error: "Email and password are required" },
      { status: 400 }
    );
  }

  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = signAdminSession({
    adminId: admin.id,
    email: admin.email,
    role: admin.role,
  });

  const cookie = makeAdminCookie(token);
  return Response.json(
    { admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } },
    {
      status: 200,
      headers: {
        "Set-Cookie": `${cookie.name}=${cookie.value}; Path=${cookie.path}; Max-Age=${cookie.maxAge}; HttpOnly; SameSite=Lax${cookie.secure ? "; Secure" : ""}`,
      },
    }
  );
}
