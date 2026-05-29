export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { notFound } from "next/navigation";
import { QuizForm } from "@/components/admin/quiz-form";

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAdminSession();

  const quiz = await db.quiz.findFirst({ where: { id, adminId: session!.adminId } });
  if (!quiz) notFound();

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Quiz</h1>
      </div>
      <QuizForm
        initialData={{
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          instructions: quiz.instructions,
          durationMinutes: quiz.durationMinutes,
          startDate: quiz.startDate?.toISOString() ?? null,
          endDate: quiz.endDate?.toISOString() ?? null,
          passingScore: quiz.passingScore,
          randomiseQuestions: quiz.randomiseQuestions,
          randomiseOptions: quiz.randomiseOptions,
          showAnswers: quiz.showAnswers,
        }}
      />
    </div>
  );
}
