"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resetPassword } from "@/lib/auth/client";
import { passwordSchema } from "@/lib/auth/password";
import { Loader2, KeyRound } from "lucide-react";
import InvalidResetLink from "./invalid-link";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid password.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }

    startTransition(async () => {
      const response = await resetPassword({ newPassword: password, token });

      if (response.error) {
        toast.error(response.error.message);
      } else {
        toast.success("Password updated. Sign in with your new password.");
        router.push("/signin");
      }
    });
  }

  if (!token) {
    return <InvalidResetLink />;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full flex-col border border-space-line-soft bg-space-deep/70 px-8 py-6 backdrop-blur-sm md:w-96">
        <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.24em] text-ion">
          {"Recovery"}
        </p>
        <h1 className="mt-2 font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory">
          Set New Password
        </h1>
        <p className="mt-1 text-sm text-space-muted">
          Choose a strong password of at least 12 characters.
        </p>

        <form onSubmit={onSubmit} className="my-6 flex flex-col gap-4">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-space-muted" />
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending}
              className="signal-input ps-9 disabled:opacity-50"
            />
          </div>
          <input
            type="password"
            required
            autoComplete="new-password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isPending}
            className="signal-input disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending}
            className="signal-btn-primary w-full disabled:pointer-events-none disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Password"
            )}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 border-t border-space-line-soft pt-5">
          <small className="text-xs text-space-muted">Link not working?</small>
          <Link
            href="/forgot-password"
            className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion transition-colors hover:text-ion-bright"
          >
            Request Again
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-ion" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
