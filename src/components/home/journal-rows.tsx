"use client";

import Link from "next/link";
import { motion } from "motion/react";

import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import type { JournalPost } from "@/components/home/journal-console";

export default function JournalRows({ posts }: { posts: JournalPost[] }) {
  const reducedMotion = useReducedMotion();

  return (
    <ol className="border-t border-space-line-soft">
      {posts.map((post, index) => (
        <motion.li
          key={post.slug}
          initial={reducedMotion ? false : { opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="border-b border-space-line-soft"
        >
          <Link
            href={`/blogs/${post.slug}`}
            className="group grid gap-3 py-7 sm:grid-cols-[7rem_1fr_auto] sm:items-start sm:gap-8 sm:py-9"
          >
            <div className="font-mono text-[0.62rem] uppercase leading-5 tracking-[0.22em] text-space-muted">
              <p>{post.date}</p>
              <p className="mt-1 text-ion">{post.tag}</p>
            </div>
            <div>
              <h3 className="font-voyage text-lg font-medium uppercase leading-snug tracking-tight text-space-ivory transition-colors duration-300 group-hover:text-ion-bright sm:text-xl">
                <span className="mr-3 text-ion" aria-hidden="true">&gt;</span>
                {post.title}
                {index === 0 ? (
                  <motion.span
                    aria-hidden="true"
                    className="ml-2 inline-block h-[1em] w-[0.5em] translate-y-[0.15em] bg-ion"
                    animate={reducedMotion ? undefined : { opacity: [1, 0] }}
                    transition={
                      reducedMotion
                        ? undefined
                        : { duration: 0.9, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
                    }
                  />
                ) : null}
              </h3>
              {post.excerpt ? (
                <p className="mt-2.5 max-w-[58ch] font-space-body text-sm leading-6 text-space-muted sm:text-[0.95rem] sm:leading-7">
                  {post.excerpt}
                </p>
              ) : null}
              <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-space-muted/80">
                Logged by {post.author}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="hidden pt-1 font-mono text-sm text-space-line transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-ion-bright sm:block"
            >
              &rarr;
            </span>
          </Link>
        </motion.li>
      ))}
    </ol>
  );
}
