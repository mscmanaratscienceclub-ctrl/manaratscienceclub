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
      <div className="flex w-full flex-col rounded-2xl border border-manara-teal/10 bg-white px-8 py-6 shadow-subtle md:w-96">
        <h1 className="font-display text-3xl font-bold text-ink">Sign In</h1>
        <p className="mt-1 font-body text-sm text-ink/60">Welcome back! Sign in to your account.</p>
        <SignInForm redirect={(await searchParams).redirect} />
        <div className="flex items-center justify-center gap-2 border-t border-manara-teal/5 pt-5">
          <small className="font-body text-xs text-ink/50">Don&apos;t have an account?</small>
          <Link href={"/signup"} className="font-display text-sm font-bold leading-none text-manara-teal hover:text-manara-yellow">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
