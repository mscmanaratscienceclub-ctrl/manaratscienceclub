import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import AdminShell from "@/components/admin/admin-shell";

/**
 * The admin guard. Everything visual lives in `AdminShell`, which the preview
 * route renders too — one definition of the chrome, so what is verified on a
 * phone is what admins get.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/signin");
  const role = (session.user as { role: string }).role ?? "member";
  if (role !== "admin") redirect("/");

  return (
    <AdminShell user={{ name: session.user.name, email: session.user.email, role }}>
      {children}
    </AdminShell>
  );
}
