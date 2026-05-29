/**
 * Setup script for load tests.
 *
 * Creates N candidate invites for a given quiz, then writes a tokens.json
 * file that the k6 scripts consume.
 *
 * Usage:
 *   npx tsx tests/load/setup-load-data.ts \
 *     --quiz <quizId> \
 *     --count 100 \
 *     --out tests/load/tokens.json
 *
 * Prerequisites:
 *   - DATABASE_URL must be set (copies from .env.local automatically)
 *   - A quiz with questions must already exist (get the ID from the admin UI)
 */

import "dotenv/config";
import { writeFileSync } from "fs";
import { db } from "../../src/lib/db";
import { signCandidateToken } from "../../src/lib/auth";

async function main() {
  const args = process.argv.slice(2);
  const quizId = args[args.indexOf("--quiz") + 1];
  const count = parseInt(args[args.indexOf("--count") + 1] || "100");
  const outFile = args[args.indexOf("--out") + 1] || "tests/load/tokens.json";

  if (!quizId) {
    console.error("Usage: npx tsx tests/load/setup-load-data.ts --quiz <quizId> --count 100");
    process.exit(1);
  }

  console.log(`Fetching quiz ${quizId}...`);
  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { options: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!quiz) {
    console.error(`Quiz ${quizId} not found.`);
    process.exit(1);
  }

  console.log(`Found quiz "${quiz.title}" with ${quiz.questions.length} questions.`);
  console.log(`Creating ${count} test invites...`);

  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  // Clean up any previous load-test invites
  await db.candidateInvite.deleteMany({
    where: { quizId, email: { contains: "@loadtest.internal" } },
  });

  const results: Array<{
    token: string;
    questions: Array<{ id: string; options: Array<{ id: string }> }>;
  }> = [];

  for (let i = 0; i < count; i++) {
    // Create invite in DB
    const invite = await db.candidateInvite.create({
      data: {
        quizId,
        email: `loadtest${i + 1}@loadtest.internal`,
        name: `Load Test Candidate ${i + 1}`,
        zone: "Test Zone",
        token: `loadtest-placeholder-${Date.now()}-${i}`, // temp
        tokenExpiry,
        inviteStatus: "SENT",
      },
    });

    // Create registration so start session works
    await db.candidateRegistration.create({
      data: {
        inviteId: invite.id,
        fullName: `Load Test Candidate ${i + 1}`,
        email: `loadtest${i + 1}@loadtest.internal`,
        phone: "08000000000",
        zone: "Test Zone",
      },
    });

    // Sign the real JWT
    const jwt = signCandidateToken(
      { inviteId: invite.id, quizId, email: `loadtest${i + 1}@loadtest.internal` },
      tokenExpiry
    );

    // Store JWT as the token
    await db.candidateInvite.update({
      where: { id: invite.id },
      data: { token: jwt },
    });

    results.push({
      token: jwt,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        options: q.options.map((o) => ({ id: o.id })),
      })),
    });

    if ((i + 1) % 10 === 0) console.log(`  Created ${i + 1}/${count}...`);
  }

  writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`\n✅ Wrote ${count} test candidates to ${outFile}`);
  console.log(`\nRun the load test:`);
  console.log(`  k6 run tests/load/concurrent-exam.js -e BASE_URL=https://rccgsundayschoolquiz.online -e TOKENS_FILE=${outFile}`);

  await db.$disconnect?.();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
