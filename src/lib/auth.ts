import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-dev-secret";
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "fallback-admin-secret";
const ADMIN_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60; // 1 hour

export interface CandidateTokenPayload {
  inviteId: string;
  quizId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Candidate token (embedded in quiz link)
export function signCandidateToken(
  payload: Omit<CandidateTokenPayload, "iat" | "exp">,
  expiresAt: Date
): string {
  const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyCandidateToken(
  token: string
): CandidateTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as CandidateTokenPayload;
  } catch {
    return null;
  }
}

// Admin session (HTTP-only cookie)
export function signAdminSession(
  payload: Omit<AdminSessionPayload, "iat" | "exp">
): string {
  return jwt.sign(payload, ADMIN_SESSION_SECRET, {
    expiresIn: SESSION_MAX_AGE,
  });
}

export function verifyAdminSession(token: string): AdminSessionPayload | null {
  try {
    return jwt.verify(token, ADMIN_SESSION_SECRET) as AdminSessionPayload;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminSession(token);
}

export function makeAdminCookie(token: string) {
  return {
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE,
    path: "/",
  };
}

export function clearAdminCookie() {
  return {
    name: ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 0,
    path: "/",
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateResetToken(): string {
  return (
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2)
  );
}
