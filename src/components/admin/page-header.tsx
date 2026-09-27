import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The heading every admin section opens with.
 *
 * One component instead of six hand-copied blocks: the tinted icon chip, the
 * eyebrow, the title and the description stay identical across sections, which
 * is what makes the panel read as one product. It replaces the plain `<div>`
 * headers that previously sat above each table.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  /** Small teal overline, e.g. `Form responses`. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Rendered in the tinted chip beside the title. */
  icon: LucideIcon;
  /** Right-aligned slot, e.g. an export link. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-manara-teal/15 bg-manara-teal/10"
        >
          <Icon className="size-5.5 text-manara-teal" />
        </span>
        <div className="min-w-0">
          {eyebrow && (
            <p className="font-body text-xs font-semibold tracking-[0.18em] text-manara-teal uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-1 font-display text-2xl font-bold text-ink md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl font-body text-sm text-ink/55 md:text-base">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </header>
  );
}
