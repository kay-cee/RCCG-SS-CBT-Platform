import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const zones = await db.zone.findMany({ orderBy: { name: "asc" } });
  return Response.json(zones);
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await request.json();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });

  const zone = await db.zone.create({ data: { name } });
  return Response.json(zone, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await db.zone.delete({ where: { id } });
  return Response.json({ success: true });
}
