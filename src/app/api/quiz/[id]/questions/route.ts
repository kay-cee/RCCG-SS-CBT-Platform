import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

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
  // body can be a single question or an array
  const questions = Array.isArray(body) ? body : [body];

  const lastQuestion = await db.question.findFirst({
    where: { quizId },
    orderBy: { order: "desc" },
  });
  let nextOrder = (lastQuestion?.order ?? 0) + 1;

  const created = await db.$transaction(
    questions.map((q) => {
      const order = nextOrder++;
      return db.question.create({
        data: {
          quizId,
          type: q.type,
          text: q.text,
          marks: q.marks ?? 1,
          order,
          options:
            q.type === "MCQ" && q.options?.length
              ? {
                  create: q.options.map(
                    (
                      opt: { text: string; isCorrect: boolean },
                      idx: number
                    ) => ({
                      text: opt.text,
                      isCorrect: opt.isCorrect,
                      order: idx,
                    })
                  ),
                }
              : undefined,
        },
        include: { options: true },
      });
    })
  );

  return Response.json(created, { status: 201 });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: quizId } = await params;
  const quiz = await db.quiz.findFirst({ where: { id: quizId, adminId: session.adminId } });
  if (!quiz) return Response.json({ error: "Not found" }, { status: 404 });

  // Full replace: delete all questions then re-insert
  const body: Array<{
    id?: string;
    type: string;
    text: string;
    marks: number;
    order: number;
    options?: Array<{ text: string; isCorrect: boolean; order: number }>;
  }> = await request.json();

  try {
    // Delete existing (cascades to MCQOption and Answer rows)
    await db.question.deleteMany({ where: { quizId } });

    // Re-insert concurrently — avoids the 5-second $transaction timeout that
    // fires when a large PDF produces many questions with nested option creates.
    // Options are saved for both MCQ (4 choices) and FITG (1 correct-answer entry).
    const created = await Promise.all(
      body.map((q, idx) =>
        db.question.create({
          data: {
            quizId,
            type: q.type as "MCQ" | "FITG",
            text: q.text,
            marks: q.marks ?? 1,
            order: idx,
            options: q.options?.length
              ? {
                  create: q.options.map((opt, oidx) => ({
                    text: opt.text,
                    isCorrect: opt.isCorrect,
                    order: oidx,
                  })),
                }
              : undefined,
          },
          include: { options: { orderBy: { order: "asc" } } },
        })
      )
    );

    return Response.json(created);
  } catch (err) {
    console.error("[questions PUT]", err);
    return Response.json({ error: "Failed to save questions", detail: String(err) }, { status: 500 });
  }
}
