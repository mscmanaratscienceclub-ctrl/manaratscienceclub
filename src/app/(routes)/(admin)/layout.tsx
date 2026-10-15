import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import AdminShell from "@/components/admin/admin-shell";
import { AdminEmailProvider } from "@/components/admin/admin-identity";

/**
 * The admin guard. Everything visual lives in `AdminShell`, which the preview
 * route renders too — one definition of the chrome, so what is verified on a
 * phone is what admins get.
 *
 * The identity provider sits here rather than inside the shell on purpose. The
 * preview route reuses `AdminShell` against a fixture user, and it must not be
 * able to read or write the browser's cached participant list: only a layout that
 * has just checked a real session may publish an address for the cache to trust.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/signin");
  const role = (session.user as { role: string }).role ?? "member";
  if (role !== "admin") redirect("/");

  return (
    <AdminEmailProvider email={session.user.email}>
      <AdminShell user={{ name: session.user.name, email: session.user.email, role }}>
        {children}
      </AdminShell>
    </AdminEmailProvider>
  );
}
