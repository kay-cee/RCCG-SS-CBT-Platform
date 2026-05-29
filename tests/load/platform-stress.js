/**
 * Load Test 2 — 500 Concurrent Users (Platform Stress)
 *
 * Simulates a realistic mix of 500 users on the platform simultaneously:
 *   - 400 candidates actively taking exams (80%)
 *   - 80  candidates registering / checking results (16%)
 *   - 20  admins browsing the dashboard (4%)
 *
 * This tests the platform under realistic peak load — multiple quizzes
 * running in parallel, admins managing candidates while exams are live.
 *
 * Run:
 *   k6 run tests/load/platform-stress.js \
 *     -e BASE_URL=https://rccgsundayschoolquiz.online \
 *     -e TOKENS_FILE=tests/load/tokens.json \
 *     -e ADMIN_COOKIE="admin_session=<your-cookie-value>"
 *
 * Pass/fail thresholds (launch criteria):
 *   - 95th percentile < 1000ms
 *   - 99th percentile < 3000ms
 *   - Error rate < 2%
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { SharedArray } from "k6/data";
import { Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const ADMIN_COOKIE = __ENV.ADMIN_COOKIE || "";

const candidates = new SharedArray("candidates", function () {
  return JSON.parse(open(__ENV.TOKENS_FILE || "./tokens.json"));
});

const globalErrors = new Rate("global_errors");

// ---------------------------------------------------------------------------
// Test options — 500 VUs across 3 scenarios
// ---------------------------------------------------------------------------
export const options = {
  scenarios: {
    // 400 VUs — active exam takers
    active_exam_takers: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 400 },
        { duration: "5m",  target: 400 },
        { duration: "30s", target: 0 },
      ],
      exec: "examTaker",
    },

    // 80 VUs — candidates registering / loading results page
    registration_browsing: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 80 },
        { duration: "5m",  target: 80 },
        { duration: "30s", target: 0 },
      ],
      exec: "registerAndBrowse",
    },

    // 20 VUs — admins on the dashboard
    admin_dashboard: {
      executor: "constant-vus",
      vus: 20,
      duration: "6m",
      exec: "adminBrowse",
      startTime: "30s",
    },
  },

  thresholds: {
    http_req_duration:              ["p(95)<1000", "p(99)<3000"],
    http_req_failed:                ["rate<0.02"],
    global_errors:                  ["rate<0.02"],
    "http_req_duration{scenario:active_exam_takers}": ["p(95)<500"],
    "http_req_duration{scenario:admin_dashboard}":    ["p(95)<800"],
  },
};

// ---------------------------------------------------------------------------
// Scenario: Active exam taker (answer questions, submit)
// ---------------------------------------------------------------------------
export function examTaker() {
  const vuIndex = (__VU - 1) % candidates.length;
  const candidate = candidates[vuIndex];
  const token = candidate.token;
  const questions = candidate.questions;
  const headers = { "Content-Type": "application/json" };

  group("exam_flow", () => {
    // Start or resume session
    const startRes = http.post(
      `${BASE_URL}/api/candidate/${token}/start`,
      JSON.stringify({}),
      { headers }
    );
    const startOk = check(startRes, {
      "exam: session started": (r) => r.status === 200 || r.status === 201,
    });
    if (!startOk) { globalErrors.add(1); return; }

    // Answer a batch of questions
    const batchSize = Math.min(5, questions.length);
    for (let i = 0; i < batchSize; i++) {
      const q = questions[i];
      const optionId = q.options[0]?.id;
      const res = http.post(
        `${BASE_URL}/api/candidate/${token}/answer`,
        JSON.stringify({ questionId: q.id, selectedOptionId: optionId }),
        { headers }
      );
      check(res, { "exam: answer saved": (r) => r.status === 200 });
      sleep(Math.random() * 3 + 1);
    }
  });

  sleep(Math.random() * 5 + 5);
}

// ---------------------------------------------------------------------------
// Scenario: Candidate registering / browsing result
// ---------------------------------------------------------------------------
export function registerAndBrowse() {
  const vuIndex = (__VU - 1) % candidates.length;
  const candidate = candidates[vuIndex];
  const token = candidate.token;
  const headers = { "Content-Type": "application/json" };

  group("registration_flow", () => {
    // Load the quiz page
    const pageRes = http.get(`${BASE_URL}/quiz/${token}`);
    check(pageRes, { "page: loads (200)": (r) => r.status === 200 });

    sleep(1);

    // Register
    const regRes = http.post(
      `${BASE_URL}/api/candidate/${token}/register`,
      JSON.stringify({
        fullName: `Test Candidate ${__VU}`,
        email: `candidate${__VU}@test.com`,
        phone: "08012345678",
        zone: "Lagos Zone",
      }),
      { headers }
    );
    check(regRes, {
      "register: 200 or 409 (already registered)": (r) =>
        r.status === 200 || r.status === 409,
    });
  });

  sleep(Math.random() * 10 + 5);
}

// ---------------------------------------------------------------------------
// Scenario: Admin browsing the dashboard
// ---------------------------------------------------------------------------
export function adminBrowse() {
  if (!ADMIN_COOKIE) {
    sleep(10);
    return;
  }

  const headers = { Cookie: ADMIN_COOKIE };

  group("admin_dashboard", () => {
    // List quizzes
    const quizRes = http.get(`${BASE_URL}/api/quiz`, { headers });
    check(quizRes, { "admin: list quizzes (200)": (r) => r.status === 200 });

    sleep(2);

    // List zones
    const zonesRes = http.get(`${BASE_URL}/api/zones`, { headers });
    check(zonesRes, { "admin: list zones (200)": (r) => r.status === 200 });
  });

  sleep(Math.random() * 15 + 10);
}
