import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// One-time setup endpoint — disabled once any admin exists
export async function POST(request: NextRequest) {
  const count = await db.admin.count();
  if (count > 0) {
    return Response.json({ error: "Setup already complete" }, { status: 403 });
  }

  const { name, email, password } = await request.json();
  if (!name || !email || !password) {
    return Response.json({ error: "name, email, and password required" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const admin = await db.admin.create({
    data: { name, email, passwordHash, role: "SUPER_ADMIN" },
  });

  return Response.json({ id: admin.id, email: admin.email, role: admin.role }, { status: 201 });
}
