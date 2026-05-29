---
name: cbt-context
description: >
  Bootstrap a new session on the RCCG SS CBT Platform project with full context in one shot.
  Use this skill at the START of any session involving this codebase — it eliminates 20-30k tokens
  of cold-start file reading by delivering a compressed project brief covering tech stack, file map,
  all known gotchas, deployment targets, and phase status. Invoke whenever the user says
  /cbt-context, "load project context", "what's the project stack", or starts a new session
  on this project without context. Also use when someone asks about the current state of the
  platform, what's been built, or what's pending for Phase 2.
---

# RCCG SS CBT Platform — Project Context

When this skill is invoked, output the following structured brief to the user, then ask what they'd like to work on.

---

## Project Brief

**RCCG Sunday School CBT Platform** — a web-based Computer-Based Testing platform for RCCG Sunday School quizzes. Candidates receive invite links by email, register, take a quiz (MCQ + Fill-in-the-Gap), and receive scores automatically.

**Production URL:** https://rccgsundayschoolquiz.online  
**GitHub:** https://github.com/kay-cee/RCCG-SS-CBT-Platform  
**Project root:** `cbt-platform/` (monorepo subfolder)

---

## Tech Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Framework | Next.js App Router | 16.2.6 — Turbopack dev server |
| Runtime | React | 19.2 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x (PostCSS plugin) |
| ORM | Prisma | **7.x** — see gotchas below |
| Database | Prisma Postgres | db.prisma.io — built-in connection pooling |
| DB Adapter | `@prisma/adapter-pg` | Required by Prisma 7 for PostgreSQL |
| PDF Parsing | pdfjs-dist | 5.4.296 — legacy build, Node.js only |
| Email | Resend SDK | `resend` package, from: noreply@rccgsundayschoolquiz.online |
| Auth | jsonwebtoken + bcryptjs | Candidate tokens (JWT), Admin sessions (JWT cookie) |
| Hosting | Vercel | CLI-based deploys |
| UI Components | Radix UI + custom | `src/components/ui/` |
| Charts | Recharts | Installed, used in Phase 2 |
| Forms | react-hook-form + zod | |

---

## Critical Gotchas — Read Before Writing Any Code

### 1. Next.js 16: `params` and `searchParams` are Promises
```typescript
// WRONG (Next.js 13-15 pattern)
export async function GET(req, { params: { id } }) { ... }

// CORRECT (Next.js 16)
export async function GET(req, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // MUST await
}
```
This applies to ALL route handlers and ALL page components. Missing `await` causes silent undefined.

### 2. Prisma 7: No `url` in `schema.prisma`
```prisma
// WRONG — Prisma 7 will error
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")   // ← DO NOT ADD THIS
}

// CORRECT
datasource db {
  provider = "postgresql"
  // url is set in prisma.config.ts, not here
}
```
The DATABASE_URL lives in `prisma.config.ts` → `datasource.url = process.env["DATABASE_URL"]`.

### 3. Prisma 7: PrismaPg adapter required
```typescript
// src/lib/db.ts — the only correct way to instantiate the client
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const db = new PrismaClient({ adapter });
```
Generator output is `src/generated/prisma` (not the default `node_modules/.prisma`).

### 4. Prisma 7: No `$transaction` for bulk creates
`db.$transaction([...array...])` has a 5-second timeout. With 20+ questions × 4 options each, it always times out. Use `Promise.all([...])` instead — concurrent, no timeout.

### 5. pdfjs-dist: Absolute worker path required
```typescript
// WRONG — relative path breaks in Turbopack (resolves to .next/chunks/)
GlobalWorkerOptions.workerSrc = "./pdf.worker.mjs";

// CORRECT
import { resolve } from "path";
import { pathToFileURL } from "url";
const workerPath = resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
```

### 6. Build script — Prisma generate must precede Next build
```json
"build": "prisma generate && next build"
```
Vercel uses this. If only `next build` runs, the generated client is missing.

### 7. Env vars — `.env.local` not `.env`
All secrets live in `.env.local`. The file `.env` does not exist in this project. DATABASE_URL must be set there for local dev and via `vercel env add` for production.

---

## Key Files

| File | Purpose |
|---|---|
| `src/lib/db.ts` | Prisma client (PrismaPg adapter) — singleton pattern |
| `src/lib/auth.ts` | `signCandidateToken`, `verifyCandidateToken`, `signAdminSession`, `verifyAdminSession`, `hashPassword`, `verifyPassword`, `generateResetToken` (crypto.randomBytes) |
| `src/lib/email.ts` | Resend: `sendInviteEmail`, `sendScoreEmail`, `sendPasswordResetEmail` |
| `src/lib/pdf-parser.ts` | pdfjs-dist v5 bold detection; exports `parsePdfQuestions(buffer)` and `parseLines(richLines)` (for tests) |
| `src/lib/utils.ts` | `isPassed`, `scorePercentage`, `formatScore`, `formatDuration`, `cn` |
| `prisma/schema.prisma` | Models: Admin, Quiz, Question, MCQOption, CandidateInvite, CandidateRegistration, QuizSession, Answer, Zone, PasswordResetToken |
| `prisma.config.ts` | Prisma 7 config — sets DATABASE_URL for migrations |
| `prisma/seed.ts` | Seeds default admin + zones |
| `vitest.config.ts` | Unit test config (50 tests) |
| `vitest.security.config.ts` | Security integration test config (needs live server) |
| `tests/load/` | k6 load test scripts + setup-load-data.ts |

---

## API Routes

### Admin (require `admin_session` cookie)
| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Admin login → sets `admin_session` cookie |
| `/api/auth/logout` | POST | Clears cookie |
| `/api/auth/reset-password` | POST | Sends reset email |
| `/api/quiz` | GET/POST | List / create quizzes |
| `/api/quiz/[id]` | GET/PUT/DELETE | Quiz CRUD |
| `/api/quiz/[id]/questions` | PUT | Full replace (Promise.all, not $transaction) |
| `/api/quiz/[id]/parse-pdf` | POST | Upload PDF → returns parsed questions JSON |
| `/api/quiz/[id]/invite` | POST | Create + send invite emails |
| `/api/zones` | GET | List zones |
| `/api/admin/setup` | POST | One-time admin seeding (blocked after first use) |

### Candidate (require valid JWT token in URL)
| Route | Method | Purpose |
|---|---|---|
| `/api/candidate/[token]` | GET | Fetch invite info |
| `/api/candidate/[token]/register` | POST | Submit registration form |
| `/api/candidate/[token]/start` | POST | Create/resume quiz session |
| `/api/candidate/[token]/questions` | GET | Fetch questions (randomised if set) |
| `/api/candidate/[token]/answer` | POST | Auto-save single answer (upsert) |
| `/api/candidate/[token]/submit` | POST | Score + mark complete + send email |
| `/api/candidate/[token]/result` | GET | Fetch completed session result |

---

## Pages

### Admin (`/admin/`)
- `/admin/login` — login form
- `/admin` — dashboard (quiz list, stats)
- `/admin/quizzes` — quiz management
- `/admin/quizzes/new` — create quiz
- `/admin/quizzes/[id]` — quiz detail (questions, invites tabs)
- `/admin/quizzes/[id]/edit` — edit quiz settings
- `/admin/candidates` — all candidates across quizzes

### Candidate (`/quiz/[token]/`)
- `/quiz/[token]` — landing (token validation)
- `/quiz/[token]/register` — registration form
- `/quiz/[token]/start` — instructions + start button
- `/quiz/[token]/take` — quiz interface (auto-save answers, timer)
- `/quiz/[token]/result` — score display

---

## Phase Status

**Phase 1 — COMPLETE ✅**
All core features live at https://rccgsundayschoolquiz.online:
- Admin quiz CRUD, PDF upload + parse (MCQ bold detection + FITG Answer: extraction)
- Candidate invite flow + quiz session + auto-scoring
- Resend email (invites + scores + password reset)
- Vercel + Prisma Postgres (100 concurrent users, connection pooling)
- 50 unit tests (Vitest), security tests, k6 load tests

**Phase 2 — PENDING**
| Feature | Foundation already in place |
|---|---|
| FITG fuzzy scoring | FITG answers stored as `MCQOption` rows (`isCorrect:true`). `submit/route.ts` has `// FITG scoring is Phase 2 — skip for now` |
| Analytics dashboard | `QuizSession.score/totalMarks` + `CandidateInvite.zone` ready. Recharts installed. |
| Question bank | Schema change needed (optional `quizId` FK or many-to-many) |
| Export CSV | New route `GET /api/quiz/[id]/export` needed |
| Scheduling | `Quiz.startDate/endDate` fields exist, enforcement not yet implemented |

---

## Credentials & Config (local dev)

| Item | Value |
|---|---|
| Admin email | admin@rccg.org |
| Admin password | Admin@1234 |
| Dev server | `npm run dev` → http://localhost:3000 |
| DATABASE_URL | In `.env.local` (Prisma Postgres) |
| RESEND_API_KEY | In `.env.local` |
| EMAIL_FROM | `RCCG CBT Platform <noreply@rccgsundayschoolquiz.online>` |

---

## Test Commands

```bash
npm test                                    # 50 unit tests (auth, utils, pdf-parser)
npm run test:coverage                       # with coverage report
BASE_URL=http://localhost:3000 npm run test:security   # security integration tests
npx tsx tests/load/setup-load-data.ts --quiz <id> --count 100  # seed load test data
k6 run tests/load/concurrent-exam.js -e BASE_URL=https://rccgsundayschoolquiz.online -e TOKENS_FILE=tests/load/tokens.json
```

---

After outputting this brief, ask: **"What would you like to work on?"**
