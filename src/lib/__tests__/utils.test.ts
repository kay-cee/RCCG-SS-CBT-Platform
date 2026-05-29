import { describe, it, expect } from "vitest";
import { isPassed, scorePercentage, formatScore, formatDuration } from "../utils";

// ---------------------------------------------------------------------------
// isPassed
// ---------------------------------------------------------------------------
describe("isPassed", () => {
  it("returns null when no passing score is set", () => {
    expect(isPassed(18, 20, null)).toBeNull();
    expect(isPassed(18, 20, undefined)).toBeNull();
  });

  it("passes when percentage meets the threshold exactly", () => {
    // 15/20 = 75%, threshold = 75 → pass
    expect(isPassed(15, 20, 75)).toBe(true);
  });

  it("passes when percentage exceeds the threshold", () => {
    expect(isPassed(20, 20, 50)).toBe(true);
  });

  it("fails when percentage is below the threshold", () => {
    // 10/20 = 50%, threshold = 75 → fail
    expect(isPassed(10, 20, 75)).toBe(false);
  });

  it("handles zero score", () => {
    expect(isPassed(0, 20, 1)).toBe(false);
    expect(isPassed(0, 20, 0)).toBe(true);
  });

  it("handles zero total marks (edge case — returns 0%)", () => {
    // scorePercentage returns 0 when total is 0, so always fails any positive threshold
    expect(isPassed(0, 0, 50)).toBe(false);
  });

  it("handles fractional marks correctly", () => {
    // 7.5 / 10 = 75%, threshold = 70 → pass
    expect(isPassed(7.5, 10, 70)).toBe(true);
    // 7 / 10 = 70%, threshold = 75 → fail
    expect(isPassed(7, 10, 75)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scorePercentage
// ---------------------------------------------------------------------------
describe("scorePercentage", () => {
  it("returns 0 when total is 0", () => {
    expect(scorePercentage(0, 0)).toBe(0);
  });

  it("rounds correctly", () => {
    // 1/3 ≈ 33.33 → rounds to 33
    expect(scorePercentage(1, 3)).toBe(33);
    // 2/3 ≈ 66.67 → rounds to 67
    expect(scorePercentage(2, 3)).toBe(67);
  });

  it("returns 100 for perfect score", () => {
    expect(scorePercentage(20, 20)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// formatScore
// ---------------------------------------------------------------------------
describe("formatScore", () => {
  it("formats a normal score", () => {
    expect(formatScore(15, 20)).toBe("15/20 (75%)");
  });

  it("handles perfect score", () => {
    expect(formatScore(20, 20)).toBe("20/20 (100%)");
  });

  it("handles zero score", () => {
    expect(formatScore(0, 20)).toBe("0/20 (0%)");
  });

  it("handles zero total (returns 0%)", () => {
    expect(formatScore(0, 0)).toBe("0/0 (0%)");
  });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------
describe("formatDuration", () => {
  it("formats minutes under an hour", () => {
    expect(formatDuration(40)).toBe("40m");
    expect(formatDuration(1)).toBe("1m");
    expect(formatDuration(59)).toBe("59m");
  });

  it("formats exactly one hour", () => {
    expect(formatDuration(60)).toBe("1h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(125)).toBe("2h 5m");
  });

  it("formats multiple hours with no remainder", () => {
    expect(formatDuration(120)).toBe("2h");
    expect(formatDuration(180)).toBe("3h");
  });
});
