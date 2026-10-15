"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { resetAnalytics } from "@/lib/analytics";
import { clearAdminCache } from "@/lib/admin/idb";

export default function SignOutButton() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const onSignOut = async () => {
    setIsPending(true);
    try {
      // Same rule as the panel's own sign-out: no participant list and no unsent
      // change survives the session that was allowed to hold them.
      await clearAdminCache();
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            resetAnalytics();
            router.push("/");
            router.refresh();
          },
        },
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={onSignOut}
      className="msc-btn-ghost disabled:pointer-events-none disabled:opacity-60"
    >
      <LogOut className="size-4" />
      Logout
    </button>
  );
}
