export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { QuizDetailTabs } from "./quiz-detail-tabs";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAdminSession();

  const quiz = await db.quiz.findFirst({
    where: { id, adminId: session!.adminId },
    include: {
      questions: {
        include: { options: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
      invites: {
        include: {
          registration: true,
          session: { select: { score: true, totalMarks: true, status: true, startTime: true, submittedAt: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!quiz) notFound();

  const statusVariant: Record<string, "info" | "success" | "default"> = {
    DRAFT: "default",
    ACTIVE: "info",
    CLOSED: "success",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/quizzes" className="text-sm text-slate-500 hover:text-teal-600">
              ← Quizzes
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{quiz.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={statusVariant[quiz.status] ?? "default"}>{quiz.status}</Badge>
            <span className="text-sm text-slate-500">{quiz.durationMinutes} min</span>
            <span className="text-sm text-slate-500">{quiz.questions.length} questions</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/admin/quizzes/${id}/edit`}
            className="border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      <QuizDetailTabs quiz={quiz} />
    </div>
  );
}
