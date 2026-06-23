"use client";

import { Send, CheckCircle2, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { useSession } from "@/lib/auth/client";
import Link from "next/link";

export default function JoinPage() {
  const { data: session, isPending } = useSession();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-cream py-16 flex items-center justify-center">
        <div className="animate-pulse text-manara-teal font-display text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-cream py-16">
        <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-surface p-10 text-center shadow-subtle border border-manara-teal/10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-manara-teal/10">
              <UserPlus className="h-10 w-10 text-manara-teal" />
            </div>
            <h1 className="font-display text-3xl font-bold text-ink mb-3">
              Join Manarat Science Club
            </h1>
            <p className="text-ink/60 font-body mb-8 max-w-sm mx-auto">
              You need an account to submit a membership application. Already a member? Sign in, or create a new account to get started.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/signin?redirect=/join"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-manara-teal bg-surface px-8 py-3 font-display font-bold text-manara-teal transition hover:bg-manara-teal/5"
              >
                <LogIn className="h-5 w-5" />
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-manara-teal px-8 py-3 font-display font-bold text-white shadow-academic transition hover:-translate-y-0.5 hover:bg-manara-teal/90"
              >
                <UserPlus className="h-5 w-5" />
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
            Join Manarat Science Club
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-body text-lg text-ink/60">
            Take the first step towards your scientific journey. Fill out the membership form below to express your interest.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-3xl bg-surface p-12 text-center shadow-subtle border border-manara-teal/10">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-manara-teal/10">
              <CheckCircle2 className="h-10 w-10 text-manara-teal" />
            </div>
            <h2 className="font-display text-3xl font-bold text-ink mb-4">Application Received!</h2>
            <p className="text-ink/60 font-body text-lg mb-8 max-w-md mx-auto">
              Thank you for your interest in joining MSC. We will review your application and get back to you with orientation details soon.
            </p>
            <button 
              onClick={() => setSubmitted(false)}
              className="font-bold text-manara-teal hover:underline"
            >
              Submit another application
            </button>
          </div>
        ) : (
          <div className="rounded-3xl bg-surface p-8 shadow-subtle border border-manara-teal/10 sm:p-10">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <h3 className="font-display text-xl font-bold text-ink border-b border-manara-teal/10 pb-2">Personal Information</h3>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="fullName" className="mb-1 block text-sm font-semibold text-ink/80">Full Name</label>
                    <input required type="text" id="fullName" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-ink focus:border-manara-teal focus:bg-surface focus:outline-none focus:ring-2 focus:ring-manara-teal/20" placeholder="John Doe" />
                  </div>
                  <div>
                    <label htmlFor="studentId" className="mb-1 block text-sm font-semibold text-ink/80">Student ID / Roll No</label>
                    <input required type="text" id="studentId" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-ink focus:border-manara-teal focus:bg-surface focus:outline-none focus:ring-2 focus:ring-manara-teal/20" placeholder="e.g. 210042" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="mb-1 block text-sm font-semibold text-ink/80">Email Address</label>
                    <input required type="email" id="email" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-ink focus:border-manara-teal focus:bg-surface focus:outline-none focus:ring-2 focus:ring-manara-teal/20" placeholder="john@example.com" />
                  </div>
                  <div>
                    <label htmlFor="cohort" className="mb-1 block text-sm font-semibold text-ink/80">Academic Cohort / Year</label>
                    <select id="cohort" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-ink focus:border-manara-teal focus:bg-surface focus:outline-none focus:ring-2 focus:ring-manara-teal/20">
                      <option>Class 9</option>
                      <option>Class 10</option>
                      <option>Class 11</option>
                      <option>Class 12</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-display text-xl font-bold text-ink border-b border-manara-teal/10 pb-2">Academic Interests</h3>
                <p className="text-sm text-ink/60 mb-3">Select the tracks you are most interested in (select all that apply):</p>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  {["Robotics Systems", "Experimental Biology", "Creative Coding", "Astronomy & Physics", "Editorial & Research", "Event Management"].map((track) => (
                    <label key={track} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors">
                      <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-manara-teal focus:ring-manara-teal" />
                      <span className="font-medium text-ink/80">{track}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-display text-xl font-bold text-ink border-b border-manara-teal/10 pb-2">Statement of Purpose</h3>
                <div>
                  <label htmlFor="sop" className="mb-2 block text-sm font-semibold text-ink/80">Why do you want to join Manarat Science Club?</label>
                  <textarea id="sop" rows={4} required className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-ink focus:border-manara-teal focus:bg-surface focus:outline-none focus:ring-2 focus:ring-manara-teal/20" placeholder="Tell us about your passion for science and what you hope to achieve..."></textarea>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="flex w-full items-center justify-center gap-3 rounded-xl bg-manara-teal px-8 py-4 font-display text-lg font-bold text-white shadow-academic transition hover:-translate-y-1 hover:bg-manara-yellow hover:text-manara-teal">
                  Submit Application <Send className="h-5 w-5" />
                </button>
                <p className="text-center text-xs text-ink/40 mt-4">By submitting this form, you agree to abide by the rules and regulations of the Manarat Science Club.</p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
