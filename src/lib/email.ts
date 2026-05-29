import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Resend requires a verified domain for custom from addresses.
// onboarding@resend.dev works on all plans without domain verification.
const FROM =
  process.env.EMAIL_FROM || "RCCG CBT Platform <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendInviteEmail({
  to,
  candidateName,
  quizTitle,
  quizDescription,
  token,
  startDate,
}: {
  to: string;
  candidateName: string;
  quizTitle: string;
  quizDescription?: string | null;
  token: string;
  startDate?: Date | null;
}) {
  const quizUrl = `${APP_URL}/quiz/${token}`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You're invited: ${quizTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0D9488">Quiz Invitation</h2>
        <p>Dear ${candidateName},</p>
        <p>You have been invited to take the quiz: <strong>${quizTitle}</strong>.</p>
        ${quizDescription ? `<p>${quizDescription}</p>` : ""}
        ${startDate ? `<p><strong>Scheduled:</strong> ${startDate.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}</p>` : ""}
        <p>Click the button below to begin. This link is unique to you — do not share it.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${quizUrl}"
             style="background:#0D9488;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;">
            Start Quiz
          </a>
        </div>
        <p style="color:#666;font-size:13px;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="color:#0D9488;font-size:13px;word-break:break-all;">${quizUrl}</p>
      </div>
    `,
  });
}

export async function sendScoreEmail({
  to,
  candidateName,
  quizTitle,
  score,
  totalMarks,
  passed,
  passingScore,
}: {
  to: string;
  candidateName: string;
  quizTitle: string;
  score: number;
  totalMarks: number;
  passed?: boolean | null;
  passingScore?: number | null;
}) {
  const percentage = Math.round((score / totalMarks) * 100);

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your results: ${quizTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0D9488">Quiz Results</h2>
        <p>Dear ${candidateName},</p>
        <p>Thank you for completing <strong>${quizTitle}</strong>. Here is your result:</p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
          <div style="font-size:48px;font-weight:bold;color:#0D9488">${percentage}%</div>
          <div style="color:#374151;font-size:18px">${score} / ${totalMarks} marks</div>
          ${
            passed !== null && passed !== undefined
              ? `<div style="margin-top:8px;font-weight:bold;color:${passed ? "#16a34a" : "#dc2626"}">${passed ? "PASS" : "FAIL"}</div>`
              : ""
          }
        </div>
        ${passingScore ? `<p style="color:#666;font-size:14px">Passing score: ${passingScore}%</p>` : ""}
        <p>Log in to the platform to review your answers in detail.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: {
  to: string;
  resetUrl: string;
}) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your password — CBT Platform",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
        <h2 style="color:#0D9488">Password Reset</h2>
        <p>You requested a password reset. Click the button below to set a new password.</p>
        <p>This link expires in 1 hour.</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}"
             style="background:#0D9488;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;">
            Reset Password
          </a>
        </div>
        <p style="color:#666;font-size:13px;">If you didn't request this, you can ignore this email safely.</p>
      </div>
    `,
  });
}
