import { describe, it, expect } from "vitest";
import {
  signCandidateToken,
  verifyCandidateToken,
  signAdminSession,
  verifyAdminSession,
  hashPassword,
  verifyPassword,
  generateResetToken,
} from "../auth";

// ---------------------------------------------------------------------------
// Candidate tokens
// ---------------------------------------------------------------------------
describe("Candidate token", () => {
  const payload = {
    inviteId: "inv_abc123",
    quizId: "quiz_xyz",
    email: "candidate@test.com",
  };

  it("signs and verifies a valid token", () => {
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1h from now
    const token = signCandidateToken(payload, expiry);
    const result = verifyCandidateToken(token);

    expect(result).not.toBeNull();
    expect(result?.inviteId).toBe(payload.inviteId);
    expect(result?.quizId).toBe(payload.quizId);
    expect(result?.email).toBe(payload.email);
  });

  it("returns null for an expired token", () => {
    // Expire 1 second in the past
    const expiry = new Date(Date.now() - 1000);
    const token = signCandidateToken(payload, expiry);
    const result = verifyCandidateToken(token);
    expect(result).toBeNull();
  });

  it("returns null for a tampered token", () => {
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    const token = signCandidateToken(payload, expiry);
    // Flip one character in the signature (last segment)
    const parts = token.split(".");
    parts[2] = parts[2].slice(0, -1) + (parts[2].slice(-1) === "a" ? "b" : "a");
    const tampered = parts.join(".");
    expect(verifyCandidateToken(tampered)).toBeNull();
  });

  it("returns null for a completely random string", () => {
    expect(verifyCandidateToken("not.a.jwt")).toBeNull();
    expect(verifyCandidateToken("")).toBeNull();
    expect(verifyCandidateToken("eyJhbGciOiJIUzI1NiJ9.e30.INVALID")).toBeNull();
  });

  it("returns null for a token signed with a different secret", () => {
    const jwt = require("jsonwebtoken");
    const foreign = jwt.sign(payload, "totally-different-secret", { expiresIn: "1h" });
    expect(verifyCandidateToken(foreign)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Admin session tokens
// ---------------------------------------------------------------------------
describe("Admin session token", () => {
  const payload = {
    adminId: "admin_001",
    email: "admin@rccg.org",
    role: "ADMIN",
  };

  it("signs and verifies a valid session", () => {
    const token = signAdminSession(payload);
    const result = verifyAdminSession(token);

    expect(result).not.toBeNull();
    expect(result?.adminId).toBe(payload.adminId);
    expect(result?.email).toBe(payload.email);
    expect(result?.role).toBe(payload.role);
  });

  it("returns null for a tampered admin token", () => {
    const token = signAdminSession(payload);
    const parts = token.split(".");
    // Tamper the payload segment
    parts[1] = Buffer.from(JSON.stringify({ adminId: "evil_admin", email: "hacker@evil.com", role: "SUPER_ADMIN" }))
      .toString("base64url");
    expect(verifyAdminSession(parts.join("."))).toBeNull();
  });

  it("returns null for a candidate token presented as admin token", () => {
    // A candidate JWT signed with JWT_SECRET should NOT verify with ADMIN_SESSION_SECRET
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    const candidateToken = signCandidateToken(
      { inviteId: "x", quizId: "y", email: "c@test.com" },
      expiry
    );
    // Since secrets differ, this should fail
    const result = verifyAdminSession(candidateToken);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------
describe("Password hashing", () => {
  it("hashes a password and verifies it correctly", async () => {
    const password = "SuperSecure123!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix

    const valid = await verifyPassword(password, hash);
    expect(valid).toBe(true);
  });

  it("rejects wrong password against correct hash", async () => {
    const hash = await hashPassword("CorrectHorse");
    const valid = await verifyPassword("WrongPassword", hash);
    expect(valid).toBe(false);
  });

  it("produces a different hash each time (salt)", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");
    expect(hash1).not.toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// Reset token security
// ---------------------------------------------------------------------------
describe("generateResetToken", () => {
  it("returns a 64-character hex string (32 bytes)", () => {
    const token = generateResetToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces unique tokens on every call", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateResetToken()));
    // All 100 should be unique — probability of collision is astronomically low
    expect(tokens.size).toBe(100);
  });

  it("is not based on Math.random (uses crypto.randomBytes)", () => {
    // Verify the token source is crypto, not Math.random, by checking entropy.
    // A Math.random-based token would repeat predictably under mocked Math.random.
    const origRandom = Math.random;
    Math.random = () => 0.5; // Mock Math.random to always return 0.5
    try {
      const t1 = generateResetToken();
      const t2 = generateResetToken();
      // If crypto is used, tokens will still differ despite mocked Math.random
      expect(t1).not.toBe(t2);
    } finally {
      Math.random = origRandom;
    }
  });
});
