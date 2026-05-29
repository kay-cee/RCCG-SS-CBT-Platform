import { redirect } from "next/navigation";
import { getCandidateInvite } from "@/lib/candidate-data";

// Token landing: validate token then redirect to correct step
export default async function QuizTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getCandidateInvite(token);

  if (!invite) {
    redirect(`/quiz/${token}/invalid?reason=invalid_token`);
  }

  // Already submitted
  if (invite.session?.status === "COMPLETED") {
    redirect(`/quiz/${token}/result`);
  }

  // Session in progress — go directly to quiz
  if (invite.session?.status === "IN_PROGRESS") {
    redirect(`/quiz/${token}/take`);
  }

  // Registered but no session yet
  if (invite.registered) {
    redirect(`/quiz/${token}/start`);
  }

  // Not registered yet
  redirect(`/quiz/${token}/register`);
}
