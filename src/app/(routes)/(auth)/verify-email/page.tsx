"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { sendVerificationEmail } from "@/lib/auth/client";
import { toast } from "sonner";
import { CheckCircle2, Mail, Loader2, ArrowRight, RefreshCw } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const verifiedParam = searchParams.get("verified") === "true";

  const [isPending, startTransition] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = () => {
    if (!emailParam) {
      toast.error("Please enter your email address to resend verification.");
      return;
    }

    startTransition(async () => {
      const baseUrl = window.location.origin;
      const response = await sendVerificationEmail({
        email: emailParam,
        callbackURL: `${baseUrl}/verify-email?verified=true`,
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to resend verification email.");
      } else {
        toast.success("Verification email resent! Please check your inbox.");
        setResendCooldown(60);
      }
    });
  };

  if (verifiedParam) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-md flex-col items-center border border-space-line-soft bg-space-deep/70 p-8 text-center backdrop-blur-sm">
          <div className="mb-4 flex size-16 items-center justify-center border border-ion-line bg-ion/10 text-ion-bright">
            <CheckCircle2 className="size-10" />
          </div>
          <h1 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory">Email Verified!</h1>
          <p className="mt-2 text-sm text-space-muted">
            Thank you for verifying your email address. Your account is now fully active.
          </p>
          <div className="mt-6 w-full">
            <Link href="/" className="signal-btn-primary w-full">
              Go to Homepage
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center border border-space-line-soft bg-space-deep/70 p-8 text-center backdrop-blur-sm">
        <div className="mb-4 flex size-16 items-center justify-center border border-ion-line bg-ion/10 text-ion">
          <Mail className="size-9" />
        </div>

        <h1 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory">Check Your Email</h1>
        <p className="mt-2 text-sm text-space-muted">
          We have sent a verification link to{" "}
          {emailParam ? (
            <span className="font-semibold text-space-ivory">{emailParam}</span>
          ) : (
            "your registered email address"
          )}
          . Please click the link to complete your registration.
        </p>

        <div className="mt-6 flex w-full flex-col gap-3">
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={isPending || resendCooldown > 0 || !emailParam}
            className="signal-btn-ghost w-full disabled:pointer-events-none disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Resending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend link in ${resendCooldown}s`
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" />
                Resend Verification Email
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <Link
              href="/signin"
              className="font-mono text-xs uppercase tracking-[0.14em] text-space-muted transition-colors hover:text-ion"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-ion" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
