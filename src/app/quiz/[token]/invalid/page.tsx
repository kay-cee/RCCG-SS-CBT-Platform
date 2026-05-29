export default async function InvalidTokenPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  const messages: Record<string, { title: string; body: string }> = {
    invalid_token: {
      title: "Invalid link",
      body: "This quiz link is invalid or has not been issued to you. Please check your invitation email for the correct link.",
    },
    expired_token: {
      title: "Link expired",
      body: "This quiz link has expired. Please contact your administrator if you believe this is an error.",
    },
    already_submitted: {
      title: "Already submitted",
      body: "You have already completed this quiz. Re-attempts are not permitted.",
    },
  };

  const msg = messages[reason || ""] || {
    title: "Something went wrong",
    body: "The quiz link could not be processed. Please contact your administrator.",
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-900 mb-2">{msg.title}</h1>
        <p className="text-slate-600">{msg.body}</p>
      </div>
    </main>
  );
}
