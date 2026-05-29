import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav adminEmail={session.email} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</div>
    </div>
  );
}
