---
name: cbt-phase2
description: >
  Load Phase 2 context and implement the selected feature for the RCCG SS CBT Platform.
  Use this skill whenever the user says /cbt-phase2, "implement Phase 2", "add FITG scoring",
  "build the analytics dashboard", "add a question bank", "export results to CSV",
  "add scheduling", or asks about any feature that was deferred from Phase 1.
  This skill loads the exact current state of Phase 1 foundations so Phase 2 work
  can start immediately without re-reading the codebase from scratch.
---

# CBT Platform — Phase 2 Feature Implementation

## Phase 1 foundations (already in production)

Before implementing any Phase 2 feature, understand what Phase 1 built as the foundation:

- **Prisma schema** is at `prisma/schema.prisma`. All models exist: Quiz, Question (type: MCQ|FITG), MCQOption (used for both MCQ choices AND FITG answers), CandidateInvite (has `zone` field), QuizSession (has `score`, `totalMarks`, `status`), Answer (has `textAnswer` for FITG, `selectedOptionId` for MCQ)
- **Recharts** is already installed — import from `"recharts"`
- **All admin pages** use the pattern: server component page → fetches data → passes to client component
- **All API routes** use Next.js 16 pattern: `await params`, `getAdminSession()` for auth

---

## Available Phase 2 features

When this skill is invoked, present this menu and ask which feature to implement:

```
Phase 2 Features — which would you like to implement?

A) FITG Fuzzy Scoring
   Automatically score fill-in-the-gap questions against candidate text answers

B) Analytics Dashboard  
   Zone-level performance charts for admins — see how each zone performed

C) Question Bank
   Reuse questions across multiple quizzes without re-uploading PDFs

D) Export Results CSV
   Download all candidate results for a quiz as a spreadsheet

(You can also ask about scheduling enforcement if startDate/endDate guardrails are needed)
```

Then load the relevant section below and begin implementation.

---

## A) FITG Fuzzy Scoring

### Current state (Phase 1 foundation)
- FITG questions have `type: "FITG"` in the `Question` model
- FITG correct answers are stored as `MCQOption` rows with `isCorrect: true` — same table as MCQ options
- When a candidate answers a FITG question, their text goes into `Answer.textAnswer`
- `Answer.selectedOptionId` is `null` for FITG answers
- The submit route (`src/app/api/candidate/[token]/submit/route.ts`) has this comment at line ~57:
  ```typescript
  // FITG scoring is Phase 2 — skip for now
  ```
  Currently FITG questions always get `isCorrect: false`, `marksAwarded: 0`

### What to implement

In `submit/route.ts`, replace the placeholder comment with real scoring:

```typescript
if (q.type === "FITG" && answer.textAnswer) {
  const correctOption = q.options.find((o) => o.isCorrect);
  if (correctOption) {
    isCorrect = scoreTextAnswer(answer.textAnswer, correctOption.text);
    marksAwarded = isCorrect ? q.marks : 0;
  }
}
```

Add a `scoreTextAnswer(candidate: string, correct: string): boolean` function. Implement at minimum:
- **Exact match** (case-insensitive, trimmed): `candidate.trim().toLowerCase() === correct.trim().toLowerCase()`
- **Fuzzy match** (optional): normalize punctuation, remove articles (the, a, an), check if candidate contains all key words of the correct answer

The correct answer text is the full answer (e.g., "but righteousness and peace and joy in the Holy Spirit."). Consider what "close enough" means for Sunday School answers.

### Files to read first
- `src/app/api/candidate/[token]/submit/route.ts` (lines 36-65 — the scoring loop)
- `prisma/schema.prisma` (Answer model, MCQOption model)

---

## B) Analytics Dashboard

### Current state (Phase 1 foundation)
- `QuizSession` has: `score`, `totalMarks`, `status`, `submittedAt`, `inviteId`
- `CandidateInvite` has: `zone`, `quizId`
- No analytics page exists yet
- Recharts is installed: `import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"`

### What to implement

**1. New API route:** `GET /api/quiz/[id]/analytics`

Aggregate query:
```typescript
// Group sessions by zone, compute avg score per zone
const sessions = await db.quizSession.findMany({
  where: { status: "COMPLETED", invite: { quizId: id } },
  include: { invite: { select: { zone: true } } },
});
// Group by zone → compute: count, avgScore, avgPercentage, passCount, passRate
```

Return: `{ zones: [{ zone, count, avgPercentage, passRate }], overall: { ... } }`

**2. New admin page:** `src/app/admin/(dashboard)/quizzes/[id]/analytics/page.tsx`

Server component that:
- Fetches from `/api/quiz/[id]/analytics`
- Renders a `<ZoneBarChart>` client component

**3. Client component:** `src/components/admin/zone-bar-chart.tsx`

```tsx
"use client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
// Props: data from analytics API
// Show: average score % per zone (bar chart), pass rate per zone (second bar or line)
```

**4. Add "Analytics" tab** to the existing `quiz-detail-tabs.tsx` component.

### Files to read first
- `src/app/admin/(dashboard)/quizzes/[id]/quiz-detail-tabs.tsx`
- `src/app/admin/(dashboard)/quizzes/[id]/page.tsx`
- Any existing chart component for style reference

---

## C) Question Bank

### Current state (Phase 1 foundation)
- `Question` has a required `quizId` FK — questions are owned by exactly one quiz
- No way to reuse a question across quizzes without re-creating it
- PDF parser creates fresh questions on every upload

### Approach options (discuss with user before implementing)

**Option 1 — Optional quizId (simplest)**  
Make `quizId` optional on `Question`. A question with no `quizId` is "in the bank". Quizzes select from the bank when creating. Migration: `ALTER TABLE questions ALTER COLUMN quiz_id DROP NOT NULL`.

**Option 2 — Separate QuestionBank model**  
New model: `QuestionBank { id, adminId, title }` with `Question` having either `quizId` OR `bankId`. More structured but bigger schema change.

**Option 3 — Many-to-many quiz↔question**  
Add `QuizQuestion` join table. Most flexible but most complex migration.

Recommend Option 1 for MVP — ask user which they prefer before starting.

### Files to read first
- `prisma/schema.prisma` (Question model, relations)
- `prisma.config.ts` (migration config)
- `src/app/api/quiz/[id]/questions/route.ts` (PUT route — full replace)

---

## D) Export Results CSV

### Current state (Phase 1 foundation)
- All result data exists in DB: `QuizSession` + `CandidateInvite` + `CandidateRegistration`
- No export functionality exists

### What to implement

**New route:** `GET /api/quiz/[id]/export`

```typescript
// Auth: admin session required
// Query: all completed sessions for this quiz with candidate info
const sessions = await db.quizSession.findMany({
  where: { status: "COMPLETED", invite: { quizId: id } },
  include: {
    invite: {
      include: { registration: true }
    }
  },
  orderBy: { submittedAt: "asc" },
});

// Build CSV string
const header = "Name,Email,Zone,Score,TotalMarks,Percentage,Passed,SubmittedAt";
const rows = sessions.map(s => {
  const name = s.invite.registration?.fullName ?? s.invite.name;
  const pct = s.totalMarks ? Math.round((s.score! / s.totalMarks!) * 100) : 0;
  const passed = quiz.passingScore ? (pct >= quiz.passingScore ? "Yes" : "No") : "N/A";
  return [name, s.invite.email, s.invite.zone, s.score, s.totalMarks, pct, passed, s.submittedAt?.toISOString()].join(",");
});

return new Response([header, ...rows].join("\n"), {
  headers: {
    "Content-Type": "text/csv",
    "Content-Disposition": `attachment; filename="quiz-${id}-results.csv"`,
  },
});
```

**Add export button** in the admin quiz detail page — a simple link/button that opens `/api/quiz/[id]/export` triggering a download.

### Files to read first
- `src/app/admin/(dashboard)/quizzes/[id]/page.tsx`
- `src/app/admin/(dashboard)/quizzes/[id]/quiz-detail-tabs.tsx`

---

## After choosing a feature

1. Read the listed files to understand the current state
2. Implement the feature following Phase 1 patterns (Next.js 16 `await params`, Prisma 7 `Promise.all`, try/catch error handling)
3. Add unit tests if the feature contains pure logic (e.g., `scoreTextAnswer` in FITG scoring)
4. Run `npm test` before deploying
5. Run `/cbt-deploy` when ready to go live
