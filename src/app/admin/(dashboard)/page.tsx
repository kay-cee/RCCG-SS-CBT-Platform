export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  const session = await getAdminSession();

  const [quizCount, candidateCount, submissionCount] = await Promise.all([
    db.quiz.count({ where: { adminId: session!.adminId } }),
    db.candidateInvite.count({
      where: { quiz: { adminId: session!.adminId } },
    }),
    db.quizSession.count({
      where: {
        status: "COMPLETED",
        invite: { quiz: { adminId: session!.adminId } },
      },
    }),
  ]);

  const recentQuizzes = await db.quiz.findMany({
    where: { adminId: session!.adminId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { _count: { select: { invites: true } } },
  });

  const statusVariant: Record<string, "info" | "success" | "default"> = {
    DRAFT: "default",
    ACTIVE: "info",
    CLOSED: "success",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Quizzes", value: quizCount, href: "/admin/quizzes" },
          { label: "Total Invitees", value: candidateCount, href: "/admin/candidates" },
          { label: "Submissions", value: submissionCount, href: "/admin/candidates" },
        ].map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl font-bold text-teal-600">{kpi.value}</div>
            <div className="text-sm text-slate-500 mt-1">{kpi.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent quizzes */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Quizzes</h2>
          <Link
            href="/admin/quizzes/new"
            className="text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            + Create Quiz
          </Link>
        </div>
        {recentQuizzes.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="mb-3">No quizzes yet.</p>
            <Link href="/admin/quizzes/new" className="text-teal-600 hover:underline text-sm">
              Create your first quiz →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentQuizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/admin/quizzes/${quiz.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-slate-900">{quiz.title}</div>
                  <div className="text-sm text-slate-500 mt-0.5">
                    {quiz._count.invites} invitee{quiz._count.invites !== 1 ? "s" : ""}
                  </div>
                </div>
                <Badge variant={statusVariant[quiz.status] ?? "default"}>
                  {quiz.status}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
