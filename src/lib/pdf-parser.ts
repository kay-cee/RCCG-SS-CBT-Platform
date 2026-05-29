export interface ParsedQuestion {
  type: "MCQ" | "FITG";
  text: string;
  options: { text: string; isCorrect: boolean }[];
  marks: number;
}

interface RichLine {
  text: string;
  fontName: string;
  isBold: boolean;
}

interface RichOption {
  text: string;
  isCorrect: boolean;
  fontName: string;
  isBold: boolean;
}

const QUESTION_RE = /^(\d+)\.\s+(.+)/;
const OPTION_RE = /^\(([a-d])\)\s*(.+)/i;
const ANSWER_RE = /^Answer:\s*(.+)/i;
const FITG_RE = /_{3,}/;
// Matches "P.45 - Fill..." whether it appears as a line suffix (with leading
// whitespace) or as a standalone continuation line (zero leading whitespace).
const PAGE_REF_RE = /\s*P\.\d+\s*-\s*Fill\b.*/i;

export async function parsePdfQuestions(buffer: Buffer): Promise<ParsedQuestion[]> {
  const lines = await extractRichLines(buffer);
  return parseLines(lines);
}

async function extractRichLines(buffer: Buffer): Promise<RichLine[]> {
  // Dynamic import keeps this server-only (never bundled for the browser).
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // pdfjs-dist v5 in Node.js: do NOT set GlobalWorkerOptions.workerSrc.
  // When workerSrc is unset in a Node.js environment, pdfjs automatically
  // uses its built-in "fake worker" (main-thread processing).  Setting it
  // to a file:// URL would instead spawn a worker_threads.Worker, which
  // is unavailable or restricted in Vercel serverless and causes the parse
  // to silently fail with "Failed to parse PDF".

  const data = new Uint8Array(buffer);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdf = await (pdfjs as any).getDocument({ data, verbosity: 0 }).promise;

  const result: RichLine[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textContent: any = await page.getTextContent();
    const styles: Record<string, { fontFamily?: string }> = textContent.styles ?? {};

    // Build set of font names whose CSS fontFamily contains "bold"
    const boldFontNames = new Set<string>();
    for (const [name, style] of Object.entries(styles)) {
      if (/bold/i.test(style?.fontFamily ?? "")) {
        boldFontNames.add(name);
      }
    }

    // Bucket text items by rounded Y coordinate so items on the same line group together
    const yBuckets = new Map<number, { str: string; fontName: string }[]>();

    for (const rawItem of textContent.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = rawItem as any;
      if (typeof item.str !== "string" || !item.str.trim()) continue;

      // Snap Y to nearest 2-unit grid to absorb sub-pixel differences on the same line
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!yBuckets.has(y)) yBuckets.set(y, []);
      yBuckets.get(y)!.push({ str: item.str, fontName: item.fontName ?? "" });
    }

    // Sort buckets top-to-bottom (highest Y = top of page in PDF coordinate space)
    const sortedYs = [...yBuckets.keys()].sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = yBuckets.get(y)!;
      const text = items.map((i) => i.str).join("").trim();
      if (!text) continue;

      // Dominant font = most frequently used font on this line
      const fontFreq = new Map<string, number>();
      for (const item of items) {
        fontFreq.set(item.fontName, (fontFreq.get(item.fontName) ?? 0) + 1);
      }
      const dominantFont = [...fontFreq.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const isBold = boldFontNames.has(dominantFont);

      result.push({ text, fontName: dominantFont, isBold });
    }
  }

  return result;
}

// Exported for unit testing — allows tests to bypass PDF extraction and
// feed mock RichLine arrays directly into the parsing logic.
export function parseLines(lines: RichLine[]): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  let i = 0;

  while (i < lines.length) {
    const qMatch = lines[i].text.match(QUESTION_RE);
    if (!qMatch) {
      i++;
      continue;
    }

    let questionText = qMatch[2].trim();
    i++;

    // Accumulate wrapped question text (stops when we hit an option, next question, or Answer:)
    while (i < lines.length) {
      const next = lines[i].text;
      if (OPTION_RE.test(next) || QUESTION_RE.test(next) || ANSWER_RE.test(next)) break;
      // Strip "P.XX - Fill in the completion..." annotation that appears in FITG questions
      const fragment = next.replace(PAGE_REF_RE, "").trim();
      if (fragment) questionText += " " + fragment;
      i++;
    }

    const cleanText = questionText.trim();
    const nextLineText = i < lines.length ? lines[i].text : "";

    // Type determination: check what FOLLOWS the question text, not the question text itself.
    // A question with ___ blanks is still MCQ if it has (a)-(d) options.
    if (OPTION_RE.test(nextLineText)) {
      // Options present → MCQ (even if question text contains ___ blanks)
      const result = parseMCQQuestion(cleanText, lines, i);
      i = result.nextI;
      if (result.question) questions.push(result.question);
    } else if (FITG_RE.test(cleanText) || ANSWER_RE.test(nextLineText)) {
      // No options, has blanks (or Answer: is immediately next) → FITG
      let newI = i;
      const q = parseFITGQuestion(cleanText, lines, i, (nextI) => {
        newI = nextI;
      });
      i = newI;
      questions.push(q);
    }
    // Otherwise: no options, no blanks, no Answer: → section header or noise, skip
  }

  return questions;
}

function parseFITGQuestion(
  questionText: string,
  lines: RichLine[],
  startI: number,
  setI: (n: number) => void,
): ParsedQuestion {
  let i = startI;
  let answerText = "";

  while (i < lines.length) {
    const ansMatch = lines[i].text.match(ANSWER_RE);
    if (ansMatch) {
      answerText = ansMatch[1].trim();
      i++;
      break;
    }
    // Stop at next question
    if (QUESTION_RE.test(lines[i].text)) break;
    i++;
  }

  setI(i);
  return {
    type: "FITG",
    text: questionText,
    options: answerText ? [{ text: answerText, isCorrect: true }] : [],
    marks: 1,
  };
}

function parseMCQQuestion(
  questionText: string,
  lines: RichLine[],
  startI: number,
): { question: ParsedQuestion | null; nextI: number } {
  const options: RichOption[] = [];
  let i = startI;

  while (i < lines.length) {
    const optMatch = lines[i].text.match(OPTION_RE);
    if (!optMatch) break;
    options.push({
      text: optMatch[2].trim(),
      isCorrect: false,
      fontName: lines[i].fontName,
      isBold: lines[i].isBold,
    });
    i++;
  }

  if (options.length < 2) {
    // Not a valid MCQ — skip
    return { question: null, nextI: i };
  }

  markCorrectOption(options);

  return {
    question: {
      type: "MCQ",
      text: questionText,
      options: options.map(({ text, isCorrect }) => ({ text, isCorrect })),
      marks: 1,
    },
    nextI: i,
  };
}

function markCorrectOption(options: RichOption[]): void {
  // Strategy A: the option whose line uses a font with "bold" in the CSS family name
  const boldOpt = options.find((o) => o.isBold);
  if (boldOpt) {
    boldOpt.isCorrect = true;
    return;
  }

  // Strategy B: among the options, whichever uses the minority font is the bold one.
  // Works even when fontFamily doesn't carry "bold" (e.g., embedded subset fonts).
  const fontFreq = new Map<string, number>();
  for (const opt of options) {
    fontFreq.set(opt.fontName, (fontFreq.get(opt.fontName) ?? 0) + 1);
  }

  if (fontFreq.size > 1) {
    const sorted = [...fontFreq.entries()].sort((a, b) => a[1] - b[1]);
    if (sorted[0][1] === 1) {
      const minority = options.find((o) => o.fontName === sorted[0][0]);
      if (minority) {
        minority.isCorrect = true;
        return;
      }
    }
  }

  // Fallback: default to first option (admin can correct manually)
  options[0].isCorrect = true;
}
