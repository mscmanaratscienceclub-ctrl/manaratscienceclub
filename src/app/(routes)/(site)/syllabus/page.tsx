import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Download,
  FileClock,
  FileText,
} from "lucide-react";

import ScrollReveal from "@/components/animations/ScrollReveal";
import { pdfUrl } from "@/lib/media";
import {
  formatSyllabusDate,
  syllabusCopy,
  syllabusProgress,
  syllabusSections,
  type SyllabusDocument,
} from "@/lib/data/syllabus";

export const metadata: Metadata = {
  title: "Syllabus — Every Segment of STEM Fest 2026",
  description:
    "Download the syllabus for each STEM Fest event — Olympiads, Robotics, Project Display, E-sports and the Fun Segment — published as PDFs by Manarat Science Club.",
};

function DocumentRow({ document }: { document: SyllabusDocument }) {
  const published = document.href !== null && document.bucketPath !== null;

  if (!published) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-4 border border-dashed border-space-line-soft px-5 py-4">
        <div className="flex items-center gap-4">
          <span className="flex size-9 shrink-0 items-center justify-center border border-space-line-soft text-space-muted/70">
            <FileClock className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-voyage text-sm font-bold uppercase tracking-tight text-space-muted">
              {document.label}
            </h3>
            <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-space-muted/70">
              {document.coverage}
            </p>
          </div>
        </div>

        <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted/70">
          {syllabusCopy.pendingLabel}
        </p>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 border border-space-line-soft bg-space-black/20 px-5 py-4">
      <div className="flex items-center gap-4">
        <span className="flex size-9 shrink-0 items-center justify-center border border-ion-line text-ion">
          <FileText className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-voyage text-sm font-bold uppercase tracking-tight text-space-ivory">
            {document.label}
          </h3>
          <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-space-muted">
            {document.coverage}
            {document.updated
              ? ` · Updated ${formatSyllabusDate(document.updated)}`
              : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <a
          href={document.href ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ion transition-colors hover:text-ion-bright"
        >
          {syllabusCopy.openLabel}
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
          <span className="sr-only"> ({syllabusCopy.newTabNote})</span>
        </a>

        <a
          href={pdfUrl(document.bucketPath ?? "", { download: true })}
          className="inline-flex items-center gap-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted transition-colors hover:text-ion-bright"
        >
          <Download className="size-3.5" aria-hidden="true" />
          {syllabusCopy.downloadLabel}
        </a>
      </div>
    </li>
  );
}

export default function SyllabusPage() {
  const progress = syllabusProgress();
  const publishedCount = String(progress.published).padStart(2, "0");
  const totalCount = String(progress.total).padStart(2, "0");

  return (
    <div className="min-h-screen bg-space-deep">
      <section className="relative overflow-hidden border-b border-space-line-soft">
        <div
          aria-hidden="true"
          className="msc-atmosphere pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="space-grain pointer-events-none absolute inset-0"
        />

        <div className="relative mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 lg:px-16">
          <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.34em] text-ion">
            {syllabusCopy.eyebrow}
          </p>
          <h1 className="mt-5 max-w-[40rem] font-voyage text-3xl font-bold uppercase leading-[1.08] tracking-tight text-space-ivory sm:text-4xl lg:text-5xl">
            {syllabusCopy.heading}
          </h1>
          <p className="mt-5 max-w-[42rem] text-base leading-relaxed text-space-muted md:text-lg">
            {syllabusCopy.subheading}
          </p>

          <div className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-4 border-t border-space-line-soft pt-6">
            <p className="flex items-baseline gap-2">
              <span className="font-voyage text-2xl font-bold text-ion sm:text-3xl">
                {publishedCount}
              </span>
              <span className="font-voyage text-lg font-bold text-space-muted/60">
                / {totalCount}
              </span>
              <span className="ml-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted">
                {syllabusCopy.publishedLabel}
              </span>
            </p>
            <p className="max-w-[34rem] font-space-body text-xs leading-relaxed text-space-muted/80">
              {syllabusCopy.publishedNote}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="space-y-14">
          {syllabusSections.map((section) => (
            <ScrollReveal key={section.segmentId}>
              <article className="grid gap-6 border-t border-space-line-soft pt-6 lg:grid-cols-12 lg:gap-10">
                <div className="lg:col-span-4">
                  <div className="flex items-baseline gap-4">
                    <span className="font-mono text-xs font-medium tracking-[0.2em] text-ion">
                      {section.index}
                    </span>
                    <h2 className="font-voyage text-lg font-bold uppercase tracking-tight text-space-ivory">
                      {section.heading}
                    </h2>
                  </div>
                  <p className="mt-4 max-w-[32rem] font-space-body text-sm leading-relaxed text-pretty text-space-muted">
                    {section.description}
                  </p>
                </div>

                <ul className="space-y-3 lg:col-span-8">
                  {section.documents.map((document) => (
                    <DocumentRow key={document.id} document={document} />
                  ))}
                </ul>
              </article>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="mt-16 flex flex-wrap items-center gap-6 border-t border-space-line-soft pt-8">
            <Link href="/stemfestreg" className="msc-btn-pill">
              Register for STEM Fest
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/resources"
              className="inline-flex items-center gap-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-space-muted transition-colors hover:text-ion-bright"
            >
              Rulebooks and resources
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
