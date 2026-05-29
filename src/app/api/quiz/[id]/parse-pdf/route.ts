import { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { parsePdfQuestions } from "@/lib/pdf-parser";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await params; // validate route context

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return Response.json({ error: "PDF file required" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return Response.json({ error: "File must be a PDF" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const questions = await parsePdfQuestions(buffer);
    return Response.json(questions);
  } catch (err) {
    console.error("[parse-pdf] error:", err);
    return Response.json(
      { error: "Failed to parse PDF", detail: String(err) },
      { status: 500 }
    );
  }
}
