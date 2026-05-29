import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const quiz = await db.quiz.findFirst({
    where: { id, adminId: session.adminId },
    include: {
      questions: {
        include: { options: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      invites: {
        include: {
          registration: true,
          session: {
            include: { answers: { include: { selectedOption: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!quiz) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(quiz);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const quiz = await db.quiz.findFirst({ where: { id, adminId: session.adminId } });
  if (!quiz) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updated = await db.quiz.update({
    where: { id },
    data: {
      title: body.title ?? quiz.title,
      description: body.description !== undefined ? body.description : quiz.description,
      instructions: body.instructions ?? quiz.instructions,
      durationMinutes: body.durationMinutes ?? quiz.durationMinutes,
      startDate: body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : quiz.startDate,
      endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : quiz.endDate,
      passingScore: body.passingScore !== undefined ? body.passingScore : quiz.passingScore,
      randomiseQuestions: body.randomiseQuestions ?? quiz.randomiseQuestions,
      randomiseOptions: body.randomiseOptions ?? quiz.randomiseOptions,
      showAnswers: body.showAnswers ?? quiz.showAnswers,
      status: body.status ?? quiz.status,
    },
  });

  return Response.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const quiz = await db.quiz.findFirst({ where: { id, adminId: session.adminId } });
  if (!quiz) return Response.json({ error: "Not found" }, { status: 404 });

  await db.quiz.delete({ where: { id } });
  return Response.json({ success: true });
}
