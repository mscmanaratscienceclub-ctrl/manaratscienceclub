import { redirect } from "next/navigation";
import Link from "next/link";

const FALLBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/PLACEHOLDER/viewform";

export default function JoinPage() {
  const url = process.env.NEXT_PUBLIC_GOOGLE_FORM_URL || FALLBACK_FORM_URL;

  // If the env var points at our placeholder, render a tiny fallback
  // page so a misconfigured deploy doesn't silently redirect users to
  // docs.google.com/.../PLACEHOLDER. Otherwise redirect server-side.
  if (url === FALLBACK_FORM_URL) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-16">
        <div className="max-w-md rounded-3xl bg-surface p-10 text-center shadow-subtle border border-manara-teal/10">
          <h1 className="font-display text-3xl font-bold text-ink mb-3">
            Join Manarat Science Club
          </h1>
          <p className="text-ink/60 font-body mb-6">
            Our application form is hosted on Google Forms. The link will be
            available soon — check back shortly.
          </p>
          <Link
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-manara-teal px-8 py-3 font-display font-bold text-white shadow-academic transition hover:-translate-y-0.5 hover:bg-manara-yellow hover:text-manara-teal"
          >
            Open Application Form
          </Link>
        </div>
      </main>
    );
  }

  redirect(url);
}
