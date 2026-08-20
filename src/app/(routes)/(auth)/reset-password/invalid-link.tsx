import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function InvalidResetLink() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full flex-col items-center border border-space-line-soft bg-space-deep/70 px-8 py-8 text-center backdrop-blur-sm md:w-96">
        <ShieldAlert className="mb-4 size-10 text-space-amber" />
        <h1 className="font-voyage text-xl font-bold uppercase tracking-tight text-space-ivory">
          Invalid Reset Link
        </h1>
        <p className="mt-2 text-sm text-space-muted">
          This link is missing its token or has expired. Request a new one.
        </p>
        <Link href="/forgot-password" className="signal-btn-ghost mt-6 w-full">
          Request New Link
        </Link>
      </div>
    </div>
  );
}
