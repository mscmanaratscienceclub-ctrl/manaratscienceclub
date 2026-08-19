"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { requestPasswordReset } from "@/lib/auth/client";
import { Loader2, MailCheck, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    startTransition(async () => {
      const response = await requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (response.error) {
        toast.error(response.error.message);
      } else {
        // Generic success on purpose — the server never reveals whether the
        // email exists (enumeration protection).
        setSent(true);
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full flex-col border border-space-line-soft bg-space-deep/70 px-8 py-6 backdrop-blur-sm md:w-96">
        <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.24em] text-ion">
          {"// Recovery"}
        </p>
        <h1 className="mt-2 font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory">
          Forgot Password
        </h1>

        {sent ? (
          <div className="my-6 flex flex-col items-center border border-space-line-soft bg-space-deep p-6 text-center">
            <MailCheck className="mb-3 size-8 text-ion" />
            <p className="text-sm leading-relaxed text-space-muted">
              If an account exists for{" "}
              <span className="font-semibold text-space-ivory">{email}</span>,
              a reset link is on its way. It expires in 15 minutes.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-5 font-mono text-[0.64rem] font-medium uppercase tracking-[0.14em] text-ion transition-colors hover:text-ion-bright"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-sm text-space-muted">
              Enter the email tied to your account and we&apos;ll send you a
              reset link.
            </p>
            <form onSubmit={onSubmit} className="my-6 flex flex-col gap-4">
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-space-muted" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                  className="signal-input ps-9 disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="signal-btn-primary w-full disabled:pointer-events-none disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          </>
        )}

        <div className="flex items-center justify-center gap-2 border-t border-space-line-soft pt-5">
          <small className="text-xs text-space-muted">Remembered it?</small>
          <Link
            href="/signin"
            className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion transition-colors hover:text-ion-bright"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
