import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signin");
  }

  return (
    <div className="container mx-auto px-5 py-16 lg:px-8 max-w-4xl">
      <h1 className="font-display text-4xl font-bold text-manara-teal mb-8">Your Profile</h1>
      <div className="bg-surface rounded-[2rem] border border-manara-teal/10 shadow-subtle p-8">
        <ProfileForm user={session.user as any} />
      </div>
    </div>
  );
}
