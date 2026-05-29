import { redirect } from "next/navigation";

// Token landing: validate token then redirect to correct step
export default async function QuizTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/candidate/${token}`, { cache: "no-store" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = data.error || "unknown";
    redirect(`/quiz/${token}/invalid?reason=${error}`);
  }

  const data = await res.json();

  // Already submitted
  if (data.session?.status === "COMPLETED") {
    redirect(`/quiz/${token}/result`);
  }

  // Session in progress — go directly to quiz
  if (data.session?.status === "IN_PROGRESS") {
    redirect(`/quiz/${token}/take`);
  }

  // Registered but no session yet
  if (data.registered) {
    redirect(`/quiz/${token}/start`);
  }

  // Not registered yet
  redirect(`/quiz/${token}/register`);
}
