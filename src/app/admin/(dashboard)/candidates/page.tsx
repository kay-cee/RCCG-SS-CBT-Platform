export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { scorePercentage } from "@/lib/utils";
import Link from "next/link";

export default async function CandidatesPage() {
  const session = await getAdminSession();

  const invites = await db.candidateInvite.findMany({
    where: { quiz: { adminId: session!.adminId } },
    include: {
      quiz: { select: { title: true, passingScore: true } },
      registration: true,
      session: { select: { score: true, totalMarks: true, status: true, submittedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All Candidates</h1>
        <p className="text-slate-500 mt-1">{invites.length} total invite{invites.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Name", "Email", "Zone", "Quiz", "Status", "Score", "Submitted"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invites.map((invite) => {
                const name = invite.registration?.fullName || invite.name;
                const completed = invite.session?.status === "COMPLETED";
                const pct = completed
                  ? scorePercentage(invite.session!.score!, invite.session!.totalMarks!)
                  : null;
                const passed =
                  pct !== null && invite.quiz.passingScore
                    ? pct >= invite.quiz.passingScore
                    : null;

                let statusLabel = "Invited";
                if (invite.registration && !invite.session) statusLabel = "Registered";
                if (invite.session?.status === "IN_PROGRESS") statusLabel = "In Progress";
                if (completed) statusLabel = "Completed";

                return (
                  <tr key={invite.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{name}</td>
                    <td className="px-4 py-3 text-slate-600">{invite.email}</td>
                    <td className="px-4 py-3 text-slate-600">{invite.zone}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/quizzes/${invite.quizId}`}
                        className="text-teal-600 hover:underline"
                      >
                        {invite.quiz.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          completed
                            ? "success"
                            : invite.session?.status === "IN_PROGRESS"
                            ? "info"
                            : "default"
                        }
                      >
                        {statusLabel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {pct !== null ? (
                        <span className="flex items-center gap-2">
                          <span className="text-slate-700">{pct}%</span>
                          {passed !== null && (
                            <Badge variant={passed ? "success" : "error"} className="text-xs">
                              {passed ? "P" : "F"}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {invite.session?.submittedAt
                        ? new Date(invite.session.submittedAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
