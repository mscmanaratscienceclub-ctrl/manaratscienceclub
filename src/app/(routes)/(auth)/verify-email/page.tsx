"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { sendVerificationEmail } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
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
        <div className="flex w-full max-w-md flex-col items-center text-center rounded-2xl border border-manara-teal/10 bg-surface p-8 shadow-subtle">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="font-display text-2xl font-bold text-ink">Email Verified!</h1>
          <p className="mt-2 font-body text-sm text-ink/70">
            Thank you for verifying your email address. Your account is now fully active.
          </p>
          <div className="mt-6 w-full">
            <Button
              asChild
              className="w-full rounded-full bg-manara-teal font-display text-sm font-bold text-white shadow-subtle hover:bg-manara-teal/90"
            >
              <Link href="/">
                Go to Homepage
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center text-center rounded-2xl border border-manara-teal/10 bg-surface p-8 shadow-subtle">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-manara-teal/10 text-manara-teal">
          <Mail className="h-9 w-9" />
        </div>

        <h1 className="font-display text-2xl font-bold text-ink">Check Your Email</h1>
        <p className="mt-2 font-body text-sm text-ink/70">
          We have sent a verification link to{" "}
          {emailParam ? (
            <span className="font-semibold text-ink">{emailParam}</span>
          ) : (
            "your registered email address"
          )}
          . Please click the link to complete your registration.
        </p>

        <div className="mt-6 flex w-full flex-col gap-3">
          <Button
            onClick={handleResendEmail}
            disabled={isPending || resendCooldown > 0 || !emailParam}
            variant="outline"
            className="w-full rounded-full border-manara-teal/20 font-display text-sm font-bold text-manara-teal hover:bg-manara-teal/5"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend link in ${resendCooldown}s`
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </Button>

          <div className="pt-2 text-center">
            <Link
              href="/signin"
              className="font-display text-xs text-ink/50 hover:text-manara-teal"
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
          <Loader2 className="h-8 w-8 animate-spin text-manara-teal" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
