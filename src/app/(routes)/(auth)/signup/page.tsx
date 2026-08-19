import { type Metadata } from "next";
import Link from "next/link";
import SignUpForm from "./form";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignUpPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full flex-col border border-space-line-soft bg-space-deep/70 px-8 py-6 backdrop-blur-sm md:w-96">
        <p className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.24em] text-ion">
          {"// Enlist"}
        </p>
        <h1 className="mt-2 font-voyage text-2xl font-bold uppercase tracking-tight text-space-ivory">
          Sign Up
        </h1>
        <p className="mt-1 text-sm text-space-muted">Create an account to get started.</p>
        <SignUpForm />
        <div className="flex items-center justify-center gap-2 border-t border-space-line-soft pt-5">
          <small className="text-xs text-space-muted">Already have an account?</small>
          <Link href={"/signin"} className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-ion transition-colors hover:text-ion-bright">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
