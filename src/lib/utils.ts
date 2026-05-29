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

export function isPassed(
  score: number,
  total: number,
  passingScore?: number | null
): boolean | null {
  if (passingScore == null) return null;
  return scorePercentage(score, total) >= passingScore;
}
