import { describe, it, expect } from "vitest";
import { isPassed, scorePercentage, formatScore, formatDuration, scoreTextAnswer, validateJoinFields } from "../utils";

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
// scoreTextAnswer — FITG scoring
// ---------------------------------------------------------------------------
describe("scoreTextAnswer", () => {
  it("exact match (case-insensitive) passes", () => {
    expect(scoreTextAnswer("righteousness", "righteousness")).toBe(true);
    expect(scoreTextAnswer("RIGHTEOUSNESS", "righteousness")).toBe(true);
    expect(scoreTextAnswer("  righteousness  ", "righteousness")).toBe(true);
  });

  it("exact match after punctuation normalisation passes", () => {
    // Correct answer has trailing period; candidate doesn't
    expect(scoreTextAnswer(
      "but righteousness and peace and joy in the Holy Spirit",
      "but righteousness and peace and joy in the Holy Spirit."
    )).toBe(true);
  });

  it("candidate that contains the correct answer passes (substring)", () => {
    expect(scoreTextAnswer(
      "I believe the answer is righteousness and peace and joy in the Holy Spirit",
      "righteousness and peace and joy in the Holy Spirit"
    )).toBe(true);
  });

  it("keyword match passes when all significant words are present", () => {
    // Candidate omits "but" (stop word) — should still pass
    expect(scoreTextAnswer(
      "righteousness peace joy Holy Spirit",
      "but righteousness and peace and joy in the Holy Spirit."
    )).toBe(true);
  });

  it("completely wrong answer fails", () => {
    expect(scoreTextAnswer("heaven and earth", "righteousness and peace")).toBe(false);
  });

  it("empty candidate answer fails", () => {
    expect(scoreTextAnswer("", "righteousness")).toBe(false);
    expect(scoreTextAnswer("   ", "righteousness")).toBe(false);
  });

  it("empty correct answer fails", () => {
    expect(scoreTextAnswer("righteousness", "")).toBe(false);
  });

  it("partial keyword match (missing key word) fails", () => {
    // "peace" is missing — not a match
    expect(scoreTextAnswer("righteousness and joy", "righteousness and peace and joy")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateJoinFields — self-registration form validation
// ---------------------------------------------------------------------------
describe("validateJoinFields", () => {
  const valid = { fullName: "John Adeyemi", email: "john@example.com", phone: "08012345678", zone: "Grace Arena Zone" };

  it("returns no errors for valid input", () => {
    expect(validateJoinFields(valid)).toEqual({});
  });

  // --- fullName ---
  it("errors when fullName is empty", () => {
    expect(validateJoinFields({ ...valid, fullName: "" })).toHaveProperty("fullName");
  });

  it("errors when fullName is a single character", () => {
    expect(validateJoinFields({ ...valid, fullName: "A" })).toHaveProperty("fullName");
  });

  it("errors when fullName contains digits or special chars", () => {
    expect(validateJoinFields({ ...valid, fullName: "John123" })).toHaveProperty("fullName");
    expect(validateJoinFields({ ...valid, fullName: "John@Doe" })).toHaveProperty("fullName");
  });

  it("accepts fullName with hyphen and apostrophe", () => {
    expect(validateJoinFields({ ...valid, fullName: "Mary-Jane O'Brien" })).not.toHaveProperty("fullName");
  });

  it("trims whitespace before validating fullName", () => {
    expect(validateJoinFields({ ...valid, fullName: "  Jo  " })).not.toHaveProperty("fullName");
    expect(validateJoinFields({ ...valid, fullName: "  A  " })).toHaveProperty("fullName");
  });

  // --- email ---
  it("errors when email is empty", () => {
    expect(validateJoinFields({ ...valid, email: "" })).toHaveProperty("email");
  });

  it("errors for emails missing @", () => {
    expect(validateJoinFields({ ...valid, email: "notanemail.com" })).toHaveProperty("email");
  });

  it("errors for emails missing domain", () => {
    expect(validateJoinFields({ ...valid, email: "user@" })).toHaveProperty("email");
  });

  it("accepts valid email formats", () => {
    expect(validateJoinFields({ ...valid, email: "user@domain.org" })).not.toHaveProperty("email");
    expect(validateJoinFields({ ...valid, email: "user+tag@sub.domain.com" })).not.toHaveProperty("email");
  });

  // --- phone ---
  it("errors when phone is empty", () => {
    expect(validateJoinFields({ ...valid, phone: "" })).toHaveProperty("phone");
    expect(validateJoinFields({ ...valid, phone: "   " })).toHaveProperty("phone");
  });

  it("accepts any non-empty phone string", () => {
    expect(validateJoinFields({ ...valid, phone: "+234 801 234 5678" })).not.toHaveProperty("phone");
  });

  // --- zone ---
  it("errors when zone is empty", () => {
    expect(validateJoinFields({ ...valid, zone: "" })).toHaveProperty("zone");
  });

  it("returns errors for multiple invalid fields simultaneously", () => {
    const errors = validateJoinFields({ fullName: "", email: "bad", phone: "", zone: "" });
    expect(Object.keys(errors).length).toBe(4);
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
