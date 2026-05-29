/**
 * Load Test 1 — 100 Concurrent Exam Takers
 *
 * Simulates 100 candidates all taking the same quiz at the same time.
 * Each virtual user (VU) runs the full candidate flow:
 *   register → start → answer all questions → submit
 *
 * Prerequisites:
 *   1. Install k6: https://k6.io/docs/getting-started/installation/
 *   2. Create a quiz with questions and export 100 invite tokens to a file:
 *        node tests/load/setup-load-data.js > tests/load/tokens.json
 *   3. Run:
 *        k6 run tests/load/concurrent-exam.js \
 *          -e BASE_URL=https://rccgsundayschoolquiz.online \
 *          -e TOKENS_FILE=tests/load/tokens.json
 *
 * Pass/fail thresholds (launch criteria):
 *   - 95th percentile response time < 500ms per API call
 *   - Error rate < 1%
 *   - All 100 submissions complete successfully
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Rate, Trend } from "k6/metrics";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Load pre-seeded invite tokens from JSON file.
// Format: [{ "token": "JWT...", "questions": [{"id":"...","options":[{"id":"..."}]}] }, ...]
const candidates = new SharedArray("candidates", function () {
  return JSON.parse(open(__ENV.TOKENS_FILE || "./tokens.json"));
});

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const submitErrors = new Rate("submit_errors");
const answerTime = new Trend("answer_save_time", true);
const submitTime = new Trend("submit_time", true);

// ---------------------------------------------------------------------------
// Test options — 100 concurrent VUs, ramp up over 10s
// ---------------------------------------------------------------------------
export const options = {
  scenarios: {
    concurrent_exam: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 100 }, // ramp up to 100 concurrent users
        { duration: "3m",  target: 100 }, // hold for 3 minutes (full exam)
        { duration: "10s", target: 0 },   // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"],   // 95% of requests under 500ms
    http_req_failed:   ["rate<0.01"],   // < 1% error rate
    submit_errors:     ["rate<0.01"],   // < 1% submission failures
    answer_save_time:  ["p(95)<300"],   // answer auto-save under 300ms
    submit_time:       ["p(95)<800"],   // final submit under 800ms
  },
};

// ---------------------------------------------------------------------------
// Candidate flow
// ---------------------------------------------------------------------------
export default function () {
  // Each VU picks a unique candidate slot
  const vuIndex = (__VU - 1) % candidates.length;
  const candidate = candidates[vuIndex];
  const token = candidate.token;
  const questions = candidate.questions;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // ── Step 1: Start session ────────────────────────────────────────────────
  const startRes = http.post(
    `${BASE_URL}/api/candidate/${token}/start`,
    JSON.stringify({}),
    { headers }
  );
  check(startRes, {
    "start: status 200 or 201": (r) => r.status === 200 || r.status === 201,
    "start: returns sessionId": (r) => {
      try { return !!JSON.parse(r.body).sessionId; } catch { return false; }
    },
  });

  if (startRes.status !== 200 && startRes.status !== 201) {
    submitErrors.add(1);
    return;
  }

  sleep(0.5); // brief pause simulating page load

  // ── Step 2: Answer each question (simulating real exam pacing) ────────────
  for (const q of questions) {
    // Pick a random option (load test — correctness doesn't matter)
    const optionId = q.options[Math.floor(Math.random() * q.options.length)]?.id;

    const start = Date.now();
    const answerRes = http.post(
      `${BASE_URL}/api/candidate/${token}/answer`,
      JSON.stringify({ questionId: q.id, selectedOptionId: optionId }),
      { headers }
    );
    answerTime.add(Date.now() - start);

    check(answerRes, {
      "answer: saved (200)": (r) => r.status === 200,
    });

    // Simulate 2-10 seconds per question (real exam pacing)
    sleep(Math.random() * 8 + 2);
  }

  // ── Step 3: Submit ────────────────────────────────────────────────────────
  const submitStart = Date.now();
  const submitRes = http.post(
    `${BASE_URL}/api/candidate/${token}/submit`,
    JSON.stringify({}),
    { headers }
  );
  submitTime.add(Date.now() - submitStart);

  const submitOk = check(submitRes, {
    "submit: status 200":      (r) => r.status === 200,
    "submit: returns score":   (r) => {
      try { return typeof JSON.parse(r.body).score === "number"; } catch { return false; }
    },
    "submit: returns total":   (r) => {
      try { return typeof JSON.parse(r.body).totalMarks === "number"; } catch { return false; }
    },
  });

  submitErrors.add(!submitOk ? 1 : 0);
}
