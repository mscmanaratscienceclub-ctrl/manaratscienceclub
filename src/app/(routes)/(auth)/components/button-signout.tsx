"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { resetAnalytics } from "@/lib/analytics";
import { clearSentryUser } from "@/lib/sentry-helpers";

export default function SignOutButton() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const onSignOut = async () => {
    setIsPending(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            resetAnalytics();
            clearSentryUser();
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
      className="signal-btn-ghost disabled:pointer-events-none disabled:opacity-60"
    >
      <LogOut className="size-4" />
      Logout
    </button>
  );
}
