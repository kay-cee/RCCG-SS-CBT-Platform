import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

// PATCH /api/question-bank/[questionId]
// body: { action: "archive" }   → moves a quiz question to the bank (quizId = null)
// body: { action: "copy", quizId: string } → copies the bank question into a quiz
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { questionId } = await params;
  const body: { action: "archive" | "copy"; quizId?: string } = await request.json();

  if (body.action === "archive") {
    // Move question to the bank — detach from its quiz
    const question = await db.question.findUnique({
      where: { id: questionId },
      include: { options: { orderBy: { order: "asc" } } },
    });
    if (!question) return Response.json({ error: "Not found" }, { status: 404 });

    // Verify the admin owns the quiz this question belongs to (security check)
    if (question.quizId) {
      const quiz = await db.quiz.findFirst({
        where: { id: question.quizId, adminId: session.adminId },
      });
      if (!quiz) return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updated = await db.question.update({
      where: { id: questionId },
      data: { quizId: null },
      include: { options: { orderBy: { order: "asc" } } },
    });
    return Response.json(updated);
  }

  if (body.action === "copy") {
    if (!body.quizId) return Response.json({ error: "quizId required for copy" }, { status: 400 });

    // Verify admin owns the target quiz
    const quiz = await db.quiz.findFirst({
      where: { id: body.quizId, adminId: session.adminId },
    });
    if (!quiz) return Response.json({ error: "Not found" }, { status: 404 });

    // Fetch the bank question
    const source = await db.question.findUnique({
      where: { id: questionId },
      include: { options: { orderBy: { order: "asc" } } },
    });
    if (!source) return Response.json({ error: "Not found" }, { status: 404 });

    // Determine the next order position in the target quiz
    const last = await db.question.findFirst({
      where: { quizId: body.quizId },
      orderBy: { order: "desc" },
    });
    const nextOrder = (last?.order ?? -1) + 1;

    // Create a new copy in the target quiz
    const copy = await db.question.create({
      data: {
        quizId: body.quizId,
        type: source.type,
        text: source.text,
        marks: source.marks,
        order: nextOrder,
        options: {
          create: source.options.map((opt, idx) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            order: idx,
          })),
        },
      },
      include: { options: { orderBy: { order: "asc" } } },
    });

    return Response.json(copy, { status: 201 });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
