import { clearAdminCookie } from "@/lib/auth";

export async function POST() {
  const cookie = clearAdminCookie();
  return Response.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": `${cookie.name}=${cookie.value}; Path=${cookie.path}; Max-Age=0; HttpOnly; SameSite=Lax`,
      },
    }
  );
}
