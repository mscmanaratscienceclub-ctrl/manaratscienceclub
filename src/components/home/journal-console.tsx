import Link from "next/link";

import JournalRows from "@/components/home/journal-rows";

export interface JournalPost {
  slug: string;
  title: string;
  excerpt: string | null;
  author: string;
  date: string;
  tag: string;
}

export default function JournalConsole({ posts }: { posts: JournalPost[] }) {
  return (
    <section id="journal" className="bg-space-deep">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-24 sm:px-8 lg:py-32 lg:px-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.34em] text-ion">
              MSC://JOURNAL
            </p>
            <h2 className="mt-4 font-voyage text-3xl font-bold uppercase leading-tight tracking-tight text-space-ivory sm:text-4xl">
              LATEST <span className="text-ion-bright">TRANSMISSIONS</span>
            </h2>
          </div>
          <Link
            href="/blogs"
            className="border border-ion-line px-6 py-3 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ion transition-colors duration-300 hover:border-ion hover:text-ion-bright"
          >
            All publications
          </Link>
        </div>

        <div className="mt-12">
          {posts.length > 0 ? (
            <JournalRows posts={posts} />
          ) : (
            <div className="border border-space-line-soft px-8 py-16 text-center">
              <p className="font-voyage text-xl font-medium uppercase tracking-tight text-space-ivory sm:text-2xl">
                The next volume is in production.
              </p>
              <p className="mx-auto mt-4 max-w-md font-space-body text-sm leading-6 text-space-muted">
                New research from MSC members lands here as soon as it clears
                peer review.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
