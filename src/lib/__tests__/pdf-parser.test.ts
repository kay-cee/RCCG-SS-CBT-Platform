/**
 * PDF Parser unit tests.
 *
 * These tests bypass the actual PDF extraction engine (pdfjs-dist) entirely
 * and feed mock RichLine arrays directly into parseLines(). This lets us:
 *  - Run fast (no PDF I/O)
 *  - Test every branch of the parsing + bold-detection logic
 *  - Avoid needing real test PDF fixtures
 */

import { describe, it, expect } from "vitest";
import { parseLines } from "../pdf-parser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function line(text: string, fontName = "NormalFont", isBold = false) {
  return { text, fontName, isBold };
}

function boldLine(text: string, fontName = "BoldFont") {
  return { text, fontName, isBold: true };
}

// ---------------------------------------------------------------------------
// MCQ — basic parsing
// ---------------------------------------------------------------------------
describe("MCQ question parsing", () => {
  it("parses a 4-option MCQ with CSS bold font", () => {
    const lines = [
      line("1. What is the capital of Nigeria?"),
      line("(a) Ibadan"),
      line("(b) Kano"),
      boldLine("(c) Abuja"), // bold = correct
      line("(d) Lagos"),
    ];

    const result = parseLines(lines);
    expect(result).toHaveLength(1);
    const q = result[0];
    expect(q.type).toBe("MCQ");
    expect(q.text).toBe("What is the capital of Nigeria?");
    expect(q.options).toHaveLength(4);
    expect(q.options.find((o) => o.text === "Abuja")?.isCorrect).toBe(true);
    expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
  });

  it("uses minority font strategy when CSS bold is not set", () => {
    // Three options use FontA, one uses FontB → FontB is the correct answer
    const lines = [
      line("1. Who wrote the book of Romans?"),
      line("(a) Peter", "FontA"),
      line("(b) James", "FontA"),
      line("(c) Paul", "FontB"),   // minority font = correct
      line("(d) John", "FontA"),
    ];

    const result = parseLines(lines);
    expect(result).toHaveLength(1);
    const q = result[0];
    expect(q.options.find((o) => o.text === "Paul")?.isCorrect).toBe(true);
  });

  it("falls back to first option when all options use the same font", () => {
    const lines = [
      line("1. Which day is Sunday School held?"),
      line("(a) Monday", "SameFont"),
      line("(b) Wednesday", "SameFont"),
      line("(c) Friday", "SameFont"),
      line("(d) Sunday", "SameFont"),
    ];

    const result = parseLines(lines);
    expect(result).toHaveLength(1);
    // Fallback: first option (a) is marked correct
    expect(result[0].options[0].isCorrect).toBe(true);
    expect(result[0].options.slice(1).every((o) => !o.isCorrect)).toBe(true);
  });

  it("correctly classifies MCQ-with-blanks when options follow", () => {
    // Question contains ___ but has (a)-(d) options → must be MCQ, not FITG
    const lines = [
      line("1. The ___ of the Lord is the beginning of wisdom."),
      line("(a) knowledge"),
      boldLine("(b) fear"),     // bold = correct
      line("(c) love"),
      line("(d) grace"),
    ];

    const result = parseLines(lines);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("MCQ");
    expect(result[0].options.find((o) => o.text === "fear")?.isCorrect).toBe(true);
  });

  it("strips the question number from the text", () => {
    const lines = [
      line("5. What did Jesus say?"),
      boldLine("(a) I am the way"),
      line("(b) Follow the rules"),
    ];

    const result = parseLines(lines);
    expect(result[0].text).toBe("What did Jesus say?");
    // No "5." prefix
    expect(result[0].text).not.toMatch(/^\d+\./);
  });

  it("assigns marks of 1 by default", () => {
    const lines = [
      line("1. Sample question?"),
      boldLine("(a) Correct"),
      line("(b) Wrong"),
    ];
    expect(parseLines(lines)[0].marks).toBe(1);
  });

  it("skips a block with fewer than 2 options (invalid MCQ)", () => {
    const lines = [
      line("1. Question with only one option?"),
      boldLine("(a) Only one"),
      // No (b) — next question starts
      line("2. Valid question?"),
      boldLine("(a) Yes"),
      line("(b) No"),
    ];

    const result = parseLines(lines);
    // First question skipped (only 1 option), second parsed
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Valid question?");
  });
});

// ---------------------------------------------------------------------------
// MCQ — multi-question parsing
// ---------------------------------------------------------------------------
describe("Multiple MCQ questions", () => {
  it("parses 3 consecutive MCQ questions independently", () => {
    const lines = [
      line("1. First question?"),
      boldLine("(a) Answer A1"),
      line("(b) Answer B1"),
      line("(c) Answer C1"),
      line("(d) Answer D1"),

      line("2. Second question?"),
      line("(a) Answer A2"),
      boldLine("(b) Answer B2"),
      line("(c) Answer C2"),
      line("(d) Answer D2"),

      line("3. Third question?"),
      line("(a) Answer A3"),
      line("(b) Answer B3"),
      boldLine("(c) Answer C3"),
      line("(d) Answer D3"),
    ];

    const result = parseLines(lines);
    expect(result).toHaveLength(3);
    expect(result[0].options.find((o) => o.isCorrect)?.text).toBe("Answer A1");
    expect(result[1].options.find((o) => o.isCorrect)?.text).toBe("Answer B2");
    expect(result[2].options.find((o) => o.isCorrect)?.text).toBe("Answer C3");
  });
});

// ---------------------------------------------------------------------------
// FITG — Fill-in-the-Gap
// ---------------------------------------------------------------------------
describe("FITG question parsing", () => {
  it("parses a FITG with Answer: line", () => {
    const lines = [
      line("1. Faith without ___ is dead."),
      line("Answer: works"),
    ];

    const result = parseLines(lines);
    expect(result).toHaveLength(1);
    const q = result[0];
    expect(q.type).toBe("FITG");
    expect(q.text).toBe("Faith without ___ is dead.");
    expect(q.options).toHaveLength(1);
    expect(q.options[0].text).toBe("works");
    expect(q.options[0].isCorrect).toBe(true);
  });

  it("parses a FITG with no Answer: line (unanswered)", () => {
    const lines = [
      line("1. The ___ of God is love."),
      // No Answer: line — next question follows
      line("2. Another question?"),
      boldLine("(a) Yes"),
      line("(b) No"),
    ];

    const result = parseLines(lines);
    // First is FITG with no answer, second is MCQ
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("FITG");
    expect(result[0].options).toHaveLength(0);
    expect(result[1].type).toBe("MCQ");
  });

  it("handles Answer: with extra whitespace", () => {
    const lines = [
      line("1. The Spirit helps us in our ___."),
      line("Answer:   weakness   "),
    ];

    const result = parseLines(lines);
    expect(result[0].options[0].text).toBe("weakness");
  });

  it("does not confuse MCQ with blanks for FITG", () => {
    const lines = [
      line("1. ___ is the fruit of the Spirit."),
      line("(a) Anger", "FontA"),
      line("(b) Pride", "FontA"),
      boldLine("(c) Love", "BoldFont"),
      line("(d) Fear", "FontA"),
    ];

    const result = parseLines(lines);
    expect(result[0].type).toBe("MCQ"); // NOT FITG despite ___
    expect(result[0].options.find((o) => o.isCorrect)?.text).toBe("Love");
  });
});

// ---------------------------------------------------------------------------
// Mixed question types
// ---------------------------------------------------------------------------
describe("Mixed MCQ and FITG", () => {
  it("correctly parses a mix of MCQ and FITG questions", () => {
    const lines = [
      // Q1 — MCQ
      line("1. Who was the first king of Israel?"),
      line("(a) David", "FontA"),
      boldLine("(b) Saul", "BoldFont"),
      line("(c) Solomon", "FontA"),
      line("(d) Samuel", "FontA"),
      // Q2 — FITG
      line("2. God created the world in ___ days."),
      line("Answer: six"),
      // Q3 — MCQ
      line("3. What river was Jesus baptised in?"),
      line("(a) Nile", "FontA"),
      line("(b) Euphrates", "FontA"),
      line("(c) Tigris", "FontA"),
      boldLine("(d) Jordan", "BoldFont"),
    ];

    const result = parseLines(lines);
    expect(result).toHaveLength(3);
    expect(result[0].type).toBe("MCQ");
    expect(result[0].options.find((o) => o.isCorrect)?.text).toBe("Saul");
    expect(result[1].type).toBe("FITG");
    expect(result[1].options[0].text).toBe("six");
    expect(result[2].type).toBe("MCQ");
    expect(result[2].options.find((o) => o.isCorrect)?.text).toBe("Jordan");
  });
});

// ---------------------------------------------------------------------------
// Wrapped / multi-line question text
// ---------------------------------------------------------------------------
describe("Multi-line question text", () => {
  it("joins continuation lines into one question text", () => {
    const lines = [
      line("1. According to Romans 8:28, all things work together"),
      line("for good to them that love God, who are"),
      line("called according to his purpose."),
      boldLine("(a) True"),
      line("(b) False"),
    ];

    const result = parseLines(lines);
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain("all things work together");
    expect(result[0].text).toContain("called according to his purpose.");
  });

  it("stops accumulating text when it hits options", () => {
    const lines = [
      line("1. Short question?"),
      boldLine("(a) Correct"),
      line("(b) Wrong"),
    ];

    const result = parseLines(lines);
    expect(result[0].text).toBe("Short question?");
  });
});

// ---------------------------------------------------------------------------
// Noise / edge cases
// ---------------------------------------------------------------------------
describe("Edge cases and noise filtering", () => {
  it("returns empty array for empty input", () => {
    expect(parseLines([])).toEqual([]);
  });

  it("ignores lines that are not questions or options", () => {
    const lines = [
      line("RCCG Sunday School Quiz 2026"),
      line("Section A — Multiple Choice"),
      line("1. What is 1 + 1?"),
      boldLine("(a) 2"),
      line("(b) 3"),
      line(""),
      line("End of Section A"),
    ];

    const result = parseLines(lines);
    expect(result).toHaveLength(1);
  });

  it("strips P.XX - Fill annotation from question text", () => {
    // In real PDFs the page-reference annotation is always a continuation line,
    // not part of the question-number line itself.
    const lines = [
      line("1. The Lord is my ___"),
      line("P.45 - Fill in the completion"),
      line("Answer: shepherd"),
    ];

    const result = parseLines(lines);
    expect(result[0].text).not.toContain("P.45");
    expect(result[0].text).not.toContain("Fill in the completion");
  });
});
