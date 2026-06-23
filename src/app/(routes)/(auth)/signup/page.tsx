import { type Metadata } from "next";
import Link from "next/link";
import SignUpForm from "./form";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full flex-col rounded-2xl border border-manara-teal/10 bg-surface px-8 py-6 shadow-subtle md:w-96">
        <h1 className="font-display text-3xl font-bold text-ink">Sign Up</h1>
        <p className="mt-1 font-body text-sm text-ink/60">Create an account to get started.</p>
        <SignUpForm redirect={(await searchParams).redirect} />
        <div className="flex items-center justify-center gap-2 border-t border-manara-teal/5 pt-5">
          <small className="font-body text-xs text-ink/50">Already have an account?</small>
          <Link href={"/signin"} className="font-display text-sm font-bold leading-none text-manara-teal hover:text-manara-yellow">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
