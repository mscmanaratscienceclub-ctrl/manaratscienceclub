import Link from "next/link";
import { Satellite, ArrowLeft, CalendarDays } from "lucide-react";
import Nav from "@/components/nav";
import Footer from "@/components/footer";

export const metadata = {
  title: "Page Not Found | Manarat Science Club",
  description: "The page you are looking for has drifted out of orbit.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-space-deep font-space-body text-space-ivory">
      <Nav />
      <main className="relative flex min-h-[75vh] flex-col items-center justify-center overflow-hidden px-5 py-24 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 size-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ion/5 blur-3xl"
        />

        <div className="relative flex flex-col items-center">
          <div className="mb-8 flex size-16 items-center justify-center border border-ion-line bg-ion-deep/40">
            <Satellite className="size-7 text-ion" />
          </div>

          <p className="font-mono text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ion">
            Signal lost — Error 404
          </p>

          <h1 className="mt-4 font-voyage text-4xl font-bold uppercase tracking-tight text-space-ivory sm:text-6xl">
            Lost in space
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-space-muted sm:text-base">
            This page has drifted out of orbit or never existed in the first
            place. Recalibrate your coordinates and head back to mission
            control.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-ion px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-space-deep transition-colors hover:bg-ion-bright"
            >
              <ArrowLeft className="size-4" />
              Back to mission control
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 border border-ion-line px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.18em] text-space-ivory transition-colors hover:border-ion hover:text-ion-bright"
            >
              <CalendarDays className="size-4" />
              Browse events
            </Link>
          </div>

          <p className="mt-12 font-mono text-[0.6rem] uppercase tracking-[0.3em] text-space-muted/60">
            MSC · transmission ended
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
