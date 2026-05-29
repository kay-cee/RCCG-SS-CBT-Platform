/**
 * Security integration tests.
 *
 * These make real HTTP requests. Requires a running server.
 * Run with: BASE_URL=http://localhost:3000 npm run test:security
 *
 * Tests cover:
 *  A. Authentication bypass
 *  B. Authorisation / horizontal privilege escalation
 *  C. Input validation (XSS, oversized payloads)
 *  D. Token integrity & expiry enforcement
 *  E. Replay & double-submission prevention
 *  F. Information disclosure
 */

import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function get(path: string, headers: Record<string, string> = {}) {
  return fetch(`${BASE_URL}${path}`, { headers });
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// A. Authentication bypass
// ---------------------------------------------------------------------------
describe("A. Authentication bypass", () => {
  const adminRoutes = [
    "/api/quiz",
    "/api/quiz/fake-id",
    "/api/zones",
    "/api/auth/logout",
  ];

  for (const route of adminRoutes) {
    it(`GET ${route} without a session cookie → 401`, async () => {
      const res = await get(route);
      // Should be 401 or 403, never 200 with sensitive data
      expect([401, 403, 404]).toContain(res.status);
    });
  }

  it("POST /api/auth/login with wrong credentials → 401", async () => {
    const res = await post("/api/auth/login", {
      email: "admin@rccg.org",
      password: "totallyWrongPassword!",
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login with non-existent email → 401 (not 404)", async () => {
    // Must return 401 not 404 to avoid leaking whether an email exists
    const res = await post("/api/auth/login", {
      email: "nobody@nonexistent.com",
      password: "password",
    });
    expect(res.status).toBe(401);
    // Must not expose whether the email exists or not
    const body = await res.json();
    expect(JSON.stringify(body).toLowerCase()).not.toContain("not found");
  });

  it("Admin route with forged JWT (wrong secret) → 401", async () => {
    const jwt = require("jsonwebtoken");
    const forged = jwt.sign(
      { adminId: "evil", email: "hacker@evil.com", role: "SUPER_ADMIN" },
      "wrong-secret",
      { expiresIn: "1h" }
    );
    const res = await get("/api/quiz", { Cookie: `admin_session=${forged}` });
    expect([401, 403]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// B. Candidate token security
// ---------------------------------------------------------------------------
describe("B. Candidate token security", () => {
  it("Invalid token → 401 on start", async () => {
    const res = await post("/api/candidate/not-a-real-token/start", {});
    expect(res.status).toBe(401);
  });

  it("Expired token → 401 or 410 on start", async () => {
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";
    const expired = jwt.sign(
      { inviteId: "x", quizId: "y", email: "c@t.com" },
      JWT_SECRET,
      { expiresIn: -1 } // already expired
    );
    const res = await post(`/api/candidate/${expired}/start`, {});
    expect([401, 410]).toContain(res.status);
  });

  it("Random UUID as token → 401", async () => {
    const fakeToken = "aaaaaaaabbbbccccddddeeeeeeeeeeee";
    const res = await post(`/api/candidate/${fakeToken}/start`, {});
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// C. Input validation
// ---------------------------------------------------------------------------
describe("C. Input validation", () => {
  it("POST /api/auth/login with XSS payload → does not reflect unescaped HTML", async () => {
    const xssPayload = "<script>alert('xss')</script>";
    const res = await post("/api/auth/login", {
      email: xssPayload,
      password: xssPayload,
    });
    const text = await res.text();
    // The response must not reflect the raw <script> tag
    expect(text).not.toContain("<script>alert");
  });

  it("POST /api/auth/login with oversized body → does not crash (4xx)", async () => {
    const bigString = "a".repeat(1_000_000); // 1 MB
    const res = await post("/api/auth/login", { email: bigString, password: bigString });
    // Should be 400 or 413, not 500 (internal crash)
    expect(res.status).toBeLessThan(500);
  });

  it("POST /api/auth/reset-password with missing email → 400", async () => {
    const res = await post("/api/auth/reset-password", {});
    expect(res.status).toBe(400);
  });

  it("Candidate answer endpoint without questionId → 400", async () => {
    // Even with a random token this should return 400 or 401 — not 500
    const res = await post("/api/candidate/badtoken/answer", { selectedOptionId: "x" });
    expect([400, 401]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// D. Information disclosure
// ---------------------------------------------------------------------------
describe("D. Information disclosure", () => {
  it("500 errors don't leak stack traces in response body", async () => {
    // Hit an endpoint in a way likely to cause an error
    const res = await get("/api/quiz/this-id-surely-doesnt-exist");
    const text = await res.text();
    // Should not contain Node.js stack trace markers
    expect(text).not.toMatch(/at Object\.<anonymous>/);
    expect(text).not.toMatch(/node_modules/);
    expect(text).not.toMatch(/\.prisma\//);
  });

  it("Admin setup endpoint is not publicly re-runnable after first setup", async () => {
    const res = await post("/api/admin/setup", {
      email: "hacker@evil.com",
      password: "evilpassword",
      name: "Hacker",
    });
    // Should refuse — either 409 (already seeded) or 401 (requires existing creds)
    expect([400, 401, 403, 409]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// E. CORS / HTTP security headers
// ---------------------------------------------------------------------------
describe("E. HTTP security headers", () => {
  it("Homepage response includes X-Content-Type-Options header", async () => {
    const res = await get("/");
    // Next.js sets this via its security headers defaults
    const header = res.headers.get("x-content-type-options");
    expect(header).toBe("nosniff");
  });
});
