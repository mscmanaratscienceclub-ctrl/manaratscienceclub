import { type Metadata } from "next";
import SignInForm from "./form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full flex-col border border-space-line-soft bg-space-deep/70 px-8 py-6 backdrop-blur-sm md:w-96">
        <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.24em] text-ion">
          {"Access"}
        </p>
        <h1 className="mt-2 font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory">
          Sign In
        </h1>
        <p className="mt-1 text-sm text-space-muted">Welcome back! Sign in to your account.</p>
        <SignInForm redirect={(await searchParams).redirect} />
        <div className="-mt-2 flex justify-end">
          <Link
            href="/forgot-password"
            className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.14em] text-space-muted transition-colors hover:text-ion"
          >
            Forgot password?
          </Link>
        </div>
        <div className="flex items-center justify-center gap-2 border-t border-space-line-soft pt-5">
          <small className="text-xs text-space-muted">Don&apos;t have an account?</small>
          <Link href={"/signup"} className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion transition-colors hover:text-ion-bright">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
