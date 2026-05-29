import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatScore(score: number, total: number): string {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  return `${score}/${total} (${pct}%)`;
}

export function scorePercentage(score: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((score / total) * 100);
}

// ---------------------------------------------------------------------------
// FITG answer scoring
// ---------------------------------------------------------------------------

// Words too common to be meaningful when checking if an answer is correct.
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "that", "this", "it", "its", "as", "so", "if", "our", "their",
]);

function normaliseAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // strip punctuation
    .replace(/\s+/g, " ")    // collapse whitespace
    .trim();
}

/**
 * Score a candidate's text answer against the correct answer.
 *
 * Tiers (first match wins):
 *  1. Exact match after normalisation (case/punctuation insensitive).
 *  2. Candidate contains the full normalised correct answer as a substring.
 *  3. Key-word match — every significant word of the correct answer appears
 *     in the candidate (stop words and short words are ignored).
 *
 * This is intentionally generous — Sunday School answers typed in a hurry
 * should not be penalised for minor omissions of articles or conjunctions.
 */
export function scoreTextAnswer(candidate: string, correct: string): boolean {
  if (!candidate.trim() || !correct.trim()) return false;

  const normCand = normaliseAnswer(candidate);
  const normCorr = normaliseAnswer(correct);

  // Tier 1: exact normalised match
  if (normCand === normCorr) return true;

  // Tier 2: candidate contains the full correct answer
  if (normCand.includes(normCorr)) return true;

  // Tier 3: all significant words of the correct answer appear in the candidate
  const keyWords = normCorr
    .split(" ")
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  if (keyWords.length === 0) return false; // nothing meaningful to match

  const candWords = new Set(normCand.split(" "));
  return keyWords.every((w) => candWords.has(w));
}

// ---------------------------------------------------------------------------
// Self-registration field validation (shared by join-form.tsx and API route)
// ---------------------------------------------------------------------------

export interface JoinFieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  zone?: string;
}

export function validateJoinFields(fields: {
  fullName: string;
  email: string;
  phone: string;
  zone: string;
}): JoinFieldErrors {
  const e: JoinFieldErrors = {};
  const name = fields.fullName.trim();
  const email = fields.email.trim();

  if (!name || name.length < 2) {
    e.fullName = "Please enter your full name";
  } else if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    e.fullName = "Name may only contain letters, spaces, hyphens and apostrophes";
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    e.email = "Please enter a valid email address";
  }

  if (!fields.phone.trim()) {
    e.phone = "Phone number is required";
  }

  if (!fields.zone) {
    e.zone = "Please select your zone";
  }

  return e;
}

export function isPassed(
  score: number,
  total: number,
  passingScore?: number | null
): boolean | null {
  if (passingScore == null) return null;
  return scorePercentage(score, total) >= passingScore;
}
