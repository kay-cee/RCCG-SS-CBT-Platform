export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { scorePercentage } from "@/lib/utils";

export default async function QuizzesPage() {
  const session = await getAdminSession();

  const quizzes = await db.quiz.findMany({
    where: { adminId: session!.adminId },
    include: {
      _count: { select: { invites: true, questions: true } },
      invites: {
        select: {
          session: {
            select: { score: true, totalMarks: true, status: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const statusVariant: Record<string, "info" | "success" | "default"> = {
    DRAFT: "default",
    ACTIVE: "info",
    CLOSED: "success",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quizzes</h1>
          <p className="text-slate-500 mt-1">{quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}</p>
        </div>
        <Link
          href="/admin/quizzes/new"
          className="bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
        >
          + Create Quiz
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {quizzes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="mb-3">No quizzes yet.</p>
            <Link href="/admin/quizzes/new" className="text-teal-600 hover:underline text-sm">
              Create your first quiz →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Quiz Title", "Status", "Questions", "Invitees", "Submissions", "Avg Score"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quizzes.map((quiz) => {
                  const completed = quiz.invites.filter((i) => i.session?.status === "COMPLETED");
                  const avgScore =
                    completed.length > 0
                      ? Math.round(
                          completed.reduce(
                            (acc, i) =>
                              acc +
                              scorePercentage(i.session!.score!, i.session!.totalMarks!),
                            0
                          ) / completed.length
                        )
                      : null;

                  return (
                    <tr key={quiz.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/quizzes/${quiz.id}`}
                          className="font-medium text-teal-700 hover:underline"
                        >
                          {quiz.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[quiz.status] ?? "default"}>
                          {quiz.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{quiz._count.questions}</td>
                      <td className="px-4 py-3 text-slate-600">{quiz._count.invites}</td>
                      <td className="px-4 py-3 text-slate-600">{completed.length}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {avgScore !== null ? `${avgScore}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
