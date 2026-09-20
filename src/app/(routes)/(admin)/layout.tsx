import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import AdminSidebar from "@/components/admin/sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/signin");
  const role = (session.user as { role: string }).role ?? "member";
  if (role !== "admin") redirect("/");

  return (
    <div
      data-print="shell"
      className="flex h-screen overflow-hidden bg-gray-50"
    >
      {/*
        The sidebar is a dozen links deep and precedes the content on every admin
        page, so a keyboard visitor would tab through all of them to reach the
        table they came for. Hidden until focused — the first Tab reveals it.
      */}
      <a
        href="#admin-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      <AdminSidebar user={{ name: session.user.name, email: session.user.email, role }} />
      <div
        id="admin-content"
        data-print="content"
        className="flex flex-1 flex-col overflow-auto"
      >
        {children}
      </div>
    </div>
  );
}
