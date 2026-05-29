import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: quizId } = await params;
  const quiz = await db.quiz.findFirst({
    where: { id: quizId, adminId: session.adminId },
  });
  if (!quiz) return Response.json({ error: "Not found" }, { status: 404 });

  const sessions = await db.quizSession.findMany({
    where: {
      status: "COMPLETED",
      invite: { quizId },
    },
    include: {
      invite: {
        include: { registration: true },
      },
    },
    orderBy: { submittedAt: "asc" },
  });

  const escape = (v: string | null | undefined) => {
    if (v == null) return "";
    // Wrap in quotes and escape any internal quotes
    return `"${String(v).replace(/"/g, '""')}"`;
  };

  const header = ["Name", "Email", "Zone", "Score", "TotalMarks", "Percentage", "Passed", "SubmittedAt"];

  const rows = sessions.map((s) => {
    const name = s.invite.registration?.fullName ?? s.invite.name;
    const pct =
      s.totalMarks && s.totalMarks > 0
        ? Math.round((s.score! / s.totalMarks!) * 100)
        : 0;
    const passed =
      quiz.passingScore != null
        ? pct >= quiz.passingScore
          ? "Yes"
          : "No"
        : "N/A";

    return [
      escape(name),
      escape(s.invite.email),
      escape(s.invite.zone),
      s.score ?? 0,
      s.totalMarks ?? 0,
      `${pct}%`,
      passed,
      escape(s.submittedAt?.toISOString() ?? null),
    ].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  const filename = `${quiz.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-results.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
