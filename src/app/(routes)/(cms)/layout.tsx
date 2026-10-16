import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/get-session";
import CmsShell from "@/components/cms/cms-shell";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/signin");
  const role = (session.user as { role: string }).role ?? "member";
  if (!["admin", "writer"].includes(role)) redirect("/");

  // The shell is a client leaf, so the pages below it stay Server Components.
  return (
    <CmsShell user={{ name: session.user.name, email: session.user.email, role }}>
      {children}
    </CmsShell>
  );
}
