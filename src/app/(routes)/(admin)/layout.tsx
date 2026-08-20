import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import AdminSidebar from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/signin");
  const role = (session.user as { role: string }).role ?? "member";
  if (role !== "admin") redirect("/");

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AdminSidebar user={{ name: session.user.name, email: session.user.email, role }} />
      <div className="flex flex-1 flex-col overflow-auto">{children}</div>
    </div>
  );
}
