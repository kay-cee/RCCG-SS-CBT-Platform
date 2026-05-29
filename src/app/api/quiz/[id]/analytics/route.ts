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
    select: { id: true, passingScore: true },
  });
  if (!quiz) return Response.json({ error: "Not found" }, { status: 404 });

  const sessions = await db.quizSession.findMany({
    where: {
      status: "COMPLETED",
      invite: { quizId },
    },
    include: {
      invite: { select: { zone: true } },
    },
  });

  if (sessions.length === 0) {
    return Response.json({ zones: [], overall: null });
  }

  // Group by zone
  const zoneMap = new Map<
    string,
    { percentages: number[]; passCount: number }
  >();

  for (const s of sessions) {
    const zone = s.invite.zone || "Unknown";
    const pct =
      s.totalMarks && s.totalMarks > 0
        ? Math.round((s.score! / s.totalMarks!) * 100)
        : 0;
    if (!zoneMap.has(zone)) zoneMap.set(zone, { percentages: [], passCount: 0 });
    const entry = zoneMap.get(zone)!;
    entry.percentages.push(pct);
    if (quiz.passingScore != null && pct >= quiz.passingScore) entry.passCount++;
  }

  const zones = [...zoneMap.entries()]
    .map(([zone, { percentages, passCount }]) => ({
      zone,
      count: percentages.length,
      avgPercentage: Math.round(
        percentages.reduce((a, b) => a + b, 0) / percentages.length
      ),
      passCount,
      passRate:
        quiz.passingScore != null
          ? Math.round((passCount / percentages.length) * 100)
          : null,
    }))
    .sort((a, b) => b.avgPercentage - a.avgPercentage);

  // Overall stats
  const allPcts = sessions.map((s) =>
    s.totalMarks && s.totalMarks > 0
      ? Math.round((s.score! / s.totalMarks!) * 100)
      : 0
  );
  const overallAvg = Math.round(allPcts.reduce((a, b) => a + b, 0) / allPcts.length);
  const overallPass =
    quiz.passingScore != null
      ? Math.round(
          (allPcts.filter((p) => p >= quiz.passingScore!).length /
            allPcts.length) *
            100
        )
      : null;

  return Response.json({
    zones,
    overall: {
      totalSubmissions: sessions.length,
      avgPercentage: overallAvg,
      passRate: overallPass,
    },
  });
}
