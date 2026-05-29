---
name: cbt-db
description: >
  Run database operations for the RCCG SS CBT Platform with the correct Prisma 7 setup.
  Use this skill whenever the user says /cbt-db, "run a migration", "seed the database",
  "open prisma studio", "check the database", "reset test data", "regenerate prisma client",
  or any request involving database schema changes, seeding, or inspection on this project.
  This skill knows the Prisma 7 config quirks (no url in schema.prisma, prisma.config.ts,
  PrismaPg adapter) so operations work correctly without needing to re-read the config.
---

# CBT Platform — Database Operations

**Project directory:** `C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform`

## Prerequisites check

Before running any command, verify `.env.local` exists and contains `DATABASE_URL`. If it's missing, tell the user:
> "DATABASE_URL must be set in `.env.local` (not `.env`). This project uses Prisma Postgres — the connection string format is `postgres://...@db.prisma.io:5432/postgres?sslmode=require`"

---

## Commands

### `migrate` — Apply schema changes

Use when `prisma/schema.prisma` has been modified and changes need to reach the database.

```powershell
cd "C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform"
npx prisma migrate dev
```

Prisma will prompt for a migration name — use a short descriptive name (e.g., `add_question_bank`).

**Prisma 7 reminder:** The `url` field is NOT in `schema.prisma`. It's in `prisma.config.ts`. This is correct — don't add it.

After migrating, always run `generate` (migrations in Prisma 7 don't automatically regenerate the client):
```powershell
npx prisma generate
```

---

### `generate` — Regenerate Prisma client

Use after any schema change, or if TypeScript is complaining about missing Prisma types.

```powershell
cd "C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform"
npx prisma generate
```

Output goes to `src/generated/prisma/` — this is intentional (Prisma 7 generator config).

---

### `seed` — Seed the database

Populates default admin account and zones. Safe to run on an empty database.

```powershell
cd "C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform"
npx tsx prisma/seed.ts
```

Seeds:
- Admin: `admin@rccg.org` / `Admin@1234`
- Zones: Lagos, Abuja, Port Harcourt, Ibadan, Kano (and others from seed.ts)

**Note:** The seed script uses upsert — safe to run multiple times without duplicating data.

---

### `studio` — Open Prisma Studio (visual DB browser)

```powershell
cd "C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform"
npx prisma studio
```

Opens at http://localhost:5555. Shows all tables: Admin, Quiz, Question, MCQOption, CandidateInvite, CandidateRegistration, QuizSession, Answer, Zone, PasswordResetToken.

---

### `check` — Verify DB connection and record counts

Run a quick Prisma query to confirm the database is reachable and show current data volume.

```powershell
cd "C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform"
npx tsx -e "
import 'dotenv/config';
const { db } = await import('./src/lib/db.ts');
const [admins, quizzes, questions, invites, sessions] = await Promise.all([
  db.admin.count(),
  db.quiz.count(),
  db.question.count(),
  db.candidateInvite.count(),
  db.quizSession.count(),
]);
console.log({ admins, quizzes, questions, invites, sessions });
await db.\$disconnect?.();
"
```

If this fails with a connection error, the most common causes are:
1. DATABASE_URL not set in `.env.local`
2. Network/firewall blocking db.prisma.io (port 5432)
3. Credentials rotated — get fresh URL from Prisma dashboard

---

### `reset-load-test` — Clean up load test data

Removes all candidate invites, registrations, and sessions created by the load test setup script (identifiable by `@loadtest.internal` email addresses).

```powershell
cd "C:\Users\USER\OneDrive\Documents\Projects\CBT-Platform\cbt-platform"
npx tsx -e "
import 'dotenv/config';
const { db } = await import('./src/lib/db.ts');
const deleted = await db.candidateInvite.deleteMany({
  where: { email: { contains: '@loadtest.internal' } }
});
console.log('Deleted', deleted.count, 'load test invites (cascades to registrations and sessions)');
await db.\$disconnect?.();
"
```

This is safe to run before or after load tests. Cascade deletes handle related registrations and sessions automatically (defined in schema).

---

## Schema quick reference

```
Admin → Quiz → Question → MCQOption
                        ↘ Answer
Quiz → CandidateInvite → CandidateRegistration
                       → QuizSession → Answer
```

All child records cascade-delete when the parent is deleted. Deleting a Quiz removes all its questions, options, invites, registrations, sessions, and answers.

---

## When something goes wrong

**"Environment variable not found: DATABASE_URL"**  
→ `.env.local` isn't being picked up. Make sure you're running from `cbt-platform/` directory, not a parent.

**"P1001: Can't reach database server"**  
→ Prisma Postgres is at `db.prisma.io:5432`. Check network access. Not accessible from some corporate/restricted networks.

**"P2021: The table does not exist"**  
→ Migrations haven't been run. Run `migrate` first.

**TypeScript errors about missing Prisma types**  
→ Run `generate` to rebuild `src/generated/prisma/`.
