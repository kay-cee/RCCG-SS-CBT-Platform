/**
 * Server-side helpers for candidate quiz pages.
 *
 * These functions query the database directly via Prisma instead of making
 * internal HTTP fetch calls. The internal-fetch pattern breaks in Vercel
 * serverless when NEXT_PUBLIC_APP_URL is not set correctly, causing 500s on
 * all candidate-facing pages.
 *
 * Used by: /quiz/[token]/* page components (server components only).
 * Client components still call the API routes normally.
 */

import { db } from "@/lib/db";
import { verifyCandidateToken } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Shared invite lookup — replicates GET /api/candidate/[token]
// ---------------------------------------------------------------------------

export async function getCandidateInvite(token: string) {
  const payload = verifyCandidateToken(token);
  if (!payload) return null;

  const invite = await db.candidateInvite.findUnique({
    where: { token },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          description: true,
          instructions: true,
          durationMinutes: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      },
      registration: true,
      session: { select: { id: true, status: true, startTime: true } },
    },
  });

  if (!invite) return null;
  if (invite.tokenExpiry < new Date()) return null;

  // Mark as opened on first visit (fire-and-forget — don't block render)
  if (invite.inviteStatus === "SENT") {
    db.candidateInvite
      .update({ where: { id: invite.id }, data: { inviteStatus: "OPENED" } })
      .catch(() => {/* non-critical */});
  }

  return {
    inviteId: invite.id,
    name: invite.name,
    email: invite.email,
    zone: invite.zone,
    quiz: invite.quiz,
    registered: !!invite.registration,
    session: invite.session,
  };
}

// ---------------------------------------------------------------------------
// Questions — replicates GET /api/candidate/[token]/questions
// ---------------------------------------------------------------------------

export async function getCandidateQuestions(token: string) {
  const payload = verifyCandidateToken(token);
  if (!payload) return null;

  const invite = await db.candidateInvite.findUnique({
    where: { token },
    include: {
      session: { include: { answers: true } },
      quiz: {
        include: {
          questions: {
            include: { options: { orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!invite?.session) return null;
  if (invite.session.status === "COMPLETED") return null;

  const questions = invite.quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    text: q.text,
    marks: q.marks,
    order: q.order,
    options:
      q.type === "MCQ"
        ? q.options.map((o) => ({ id: o.id, text: o.text }))
        : [],
    savedAnswer: invite.session!.answers.find((a) => a.questionId === q.id) ?? null,
  }));

  return {
    questions,
    sessionId: invite.session.id,
    startTime: invite.session.startTime,
    durationMinutes: invite.quiz.durationMinutes,
  };
}

// ---------------------------------------------------------------------------
// Result — replicates GET /api/candidate/[token]/result
// ---------------------------------------------------------------------------

export async function getCandidateResult(token: string) {
  const payload = verifyCandidateToken(token);
  if (!payload) return null;

  const invite = await db.candidateInvite.findUnique({
    where: { token },
    include: {
      registration: true,
      session: {
        include: {
          answers: {
            include: {
              question: { include: { options: { orderBy: { order: "asc" } } } },
              selectedOption: true,
            },
            orderBy: { question: { order: "asc" } },
          },
        },
      },
      quiz: { select: { title: true, passingScore: true, showAnswers: true } },
    },
  });

  if (!invite?.session) return null;
  if (invite.session.status !== "COMPLETED") return null;

  const { session, quiz, registration, name } = invite;

  return {
    candidateName: registration?.fullName || name,
    quizTitle: quiz.title,
    score: session.score,
    totalMarks: session.totalMarks,
    passingScore: quiz.passingScore,
    submittedAt: session.submittedAt,
    showAnswers: quiz.showAnswers,
    answers: quiz.showAnswers
      ? session.answers.map((a) => ({
          questionId: a.questionId,
          questionText: a.question.text,
          questionType: a.question.type,
          marks: a.question.marks,
          marksAwarded: a.marksAwarded,
          isCorrect: a.isCorrect,
          selectedOptionId: a.selectedOptionId,
          selectedOptionText: a.selectedOption?.text ?? null,
          textAnswer: a.textAnswer,
          options: a.question.options.map((o) => ({
            id: o.id,
            text: o.text,
            isCorrect: o.isCorrect,
          })),
        }))
      : [],
  };
}
