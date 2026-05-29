import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const quizzes = await db.quiz.findMany({
    where: { adminId: session.adminId },
    include: {
      _count: { select: { invites: true, questions: true } },
      invites: {
        select: {
          session: { select: { score: true, totalMarks: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = quizzes.map((q) => {
    const submissions = q.invites.filter(
      (i) => i.session?.status === "COMPLETED"
    );
    const avgScore =
      submissions.length > 0
        ? submissions.reduce((acc, i) => {
            const s = i.session!;
            return acc + (s.totalMarks! > 0 ? s.score! / s.totalMarks! : 0);
          }, 0) /
          submissions.length *
          100
        : null;

    return {
      id: q.id,
      title: q.title,
      description: q.description,
      status: q.status,
      durationMinutes: q.durationMinutes,
      startDate: q.startDate,
      endDate: q.endDate,
      passingScore: q.passingScore,
      inviteeCount: q._count.invites,
      questionCount: q._count.questions,
      submissionCount: submissions.length,
      averageScore: avgScore ? Math.round(avgScore) : null,
      createdAt: q.createdAt,
    };
  });

  return Response.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    title,
    description,
    instructions,
    durationMinutes,
    startDate,
    endDate,
    passingScore,
    randomiseQuestions,
    randomiseOptions,
    showAnswers,
  } = body;

  if (!title || !instructions) {
    return Response.json(
      { error: "Title and instructions are required" },
      { status: 400 }
    );
  }

  const quiz = await db.quiz.create({
    data: {
      title,
      description: description || null,
      instructions,
      durationMinutes: durationMinutes || 40,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      passingScore: passingScore || null,
      randomiseQuestions: randomiseQuestions ?? false,
      randomiseOptions: randomiseOptions ?? false,
      showAnswers: showAnswers ?? true,
      adminId: session.adminId,
    },
  });

  return Response.json(quiz, { status: 201 });
}
