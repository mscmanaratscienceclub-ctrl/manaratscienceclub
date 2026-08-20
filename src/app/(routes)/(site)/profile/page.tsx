import { getServerSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/signin");
  }

  const { user } = session;

  return (
    <div className="container mx-auto max-w-4xl px-5 py-16 lg:px-8">
      <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
        {"Operator file"}
      </p>
      <h1 className="mb-8 mt-3 font-voyage text-3xl font-bold uppercase tracking-tight text-space-ivory">
        Your Profile
      </h1>
      <div className="border border-space-line-soft bg-space-deep/60 p-8">
        <ProfileForm
          user={{
            name: user.name,
            username: (user as { username?: string }).username ?? "",
            description: user.description ?? "",
            image: user.image,
          }}
        />
      </div>
    </div>
  );
}
