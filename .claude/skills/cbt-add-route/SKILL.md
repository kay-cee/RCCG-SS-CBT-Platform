---
name: cbt-add-route
description: >
  Scaffold a new API route for the RCCG SS CBT Platform following the exact patterns of the codebase.
  Use this skill whenever the user says /cbt-add-route, "add a new API route", "create a new endpoint",
  "add a route for [feature]", or asks to implement a new backend feature that needs an API route.
  This skill knows the Next.js 16 params-as-Promise pattern, the admin vs candidate auth patterns,
  the Prisma 7 db usage, and the error handling conventions — so generated routes are correct
  on the first try without needing to read existing routes for reference.
---

# CBT Platform — Add API Route

## Before writing anything

If the user hasn't specified, ask:
1. **Route type**: admin (requires admin session cookie) or candidate (requires JWT token in URL)?
2. **HTTP method(s)**: GET, POST, PUT, DELETE?
3. **Path**: where should the route live? (e.g., `quiz/[id]/export`, `candidate/[token]/notes`)
4. **What it does**: one sentence description

Once you have these, generate the route. Don't ask for more than you need.

---

## Project directory

`C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform\src\app\api\`

---

## Route templates

Use the correct template based on route type. These patterns are non-negotiable — they exist because Next.js 16 has breaking changes that are easy to get wrong.

### Admin route template

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(  // or POST, PUT, DELETE
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // adjust param name to match path
) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;  // MUST await — params is a Promise in Next.js 16

  // TODO: implement
  try {
    const result = await db.SOMETHING.findFirst({ where: { id } });
    if (!result) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json(result);
  } catch (err) {
    console.error("[route-name]", err);
    return Response.json({ error: "Internal error", detail: String(err) }, { status: 500 });
  }
}
```

### Candidate route template

```typescript
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { verifyCandidateToken } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;  // MUST await

  const payload = verifyCandidateToken(token);
  if (!payload) return Response.json({ error: "invalid_token" }, { status: 401 });

  const invite = await db.candidateInvite.findUnique({
    where: { token },
    include: { session: true },
  });

  if (!invite) return Response.json({ error: "invalid_token" }, { status: 401 });
  if (invite.tokenExpiry < new Date()) return Response.json({ error: "expired_token" }, { status: 410 });

  // Guard against acting on completed sessions if relevant:
  // if (invite.session?.status === "COMPLETED") return Response.json({ error: "already_submitted" }, { status: 409 });

  try {
    const body = await request.json();
    // TODO: implement

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[route-name]", err);
    return Response.json({ error: "Internal error", detail: String(err) }, { status: 500 });
  }
}
```

---

## Key rules (the why matters)

**`await params`** — Next.js 16 made params a Promise. Forgetting this means `id` is always `undefined` and db lookups silently return nothing. Every single route must do this.

**`try/catch` returning `{ error, detail }`** — Without this, Prisma errors surface as empty 500 responses that are impossible to debug. The `detail: String(err)` gives the Prisma error code (e.g., `P2025 Record not found`) in the response body.

**`getAdminSession()`** before any data access — Admin routes must reject unauthenticated requests before touching the database. The session check costs one cookie read; skipping it means any request can read/modify quiz data.

**`verifyCandidateToken()` before `db.candidateInvite.findUnique()`** — The JWT verification is cheap; the DB lookup is expensive. Always verify the token first.

---

## After generating

1. Show the complete file contents to the user
2. Ask: "Does this look right? Should I write it to `src/app/api/[path]/route.ts`?"
3. On confirmation: create the directory (if it doesn't exist) and write the file
4. Remind the user to run `npm test` after making any logic changes

---

## Common db patterns (for reference when filling in the TODO)

```typescript
// Find with ownership check (admin owns quiz)
const quiz = await db.quiz.findFirst({ where: { id, adminId: session.adminId } });

// Upsert (used in answer auto-save)
await db.answer.upsert({
  where: { sessionId_questionId: { sessionId, questionId } },
  update: { selectedOptionId },
  create: { sessionId, questionId, selectedOptionId },
});

// Concurrent creates (NOT $transaction — it times out with 20+ items)
await Promise.all(items.map(item => db.model.create({ data: item })));

// Cascade delete (questions cascade to options and answers via schema)
await db.question.deleteMany({ where: { quizId } });
```
