import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

// GET  /api/question-bank   — list all banked questions (quizId = null)
export async function GET(_req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const questions = await db.question.findMany({
    where: { quizId: null },
    include: { options: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(questions);
}

// POST /api/question-bank  — save questions directly to the bank (quizId = null)
// Body: array of { type, text, marks, options }
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body: Array<{
    type: string;
    text: string;
    marks?: number;
    options?: Array<{ text: string; isCorrect: boolean }>;
  }> = await request.json();

  try {
    const created = await Promise.all(
      body.map((q, idx) =>
        db.question.create({
          data: {
            quizId: null,           // null = in the bank
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
    return Response.json(created, { status: 201 });
  } catch (err) {
    console.error("[question-bank POST]", err);
    return Response.json({ error: "Failed to save", detail: String(err) }, { status: 500 });
  }
}
