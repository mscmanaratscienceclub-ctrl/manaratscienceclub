import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminChipSolid } from "./styles";

/**
 * The heading every admin section opens with.
 *
 * One component instead of six hand-copied blocks: the overline, the title, the
 * description and the wash behind them stay identical across sections, which is
 * what makes the panel read as one product.
 *
 * The masthead is a card in the *section's* colour rather than a bare heading on
 * the canvas: it lifts off the bone on a gradient wash lit from its own corner,
 * with the accent rule running along its top edge and a filled icon square
 * beside the overline. Together they tell an admin which of six near-identical
 * tables they are looking at before they read the title. The hue arrives through
 * the `--admin-accent*` properties the page scopes on itself (`adminAccentStyle`),
 * so this component is never told which section it is in.
 *
 * The title stays ink, never accent: the accent is identity, and identity is not
 * something to read a heading through.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  /** Small uppercase overline, e.g. `Form responses`. */
  eyebrow?: string;
  title: string;
  description?: string;
  /** Monochrome mark beside the overline. */
  icon: LucideIcon;
  /** Right-aligned slot, e.g. the export/print actions. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "admin-wash-masthead admin-edge-top flex flex-wrap items-end justify-between gap-x-6 gap-y-4 rounded-[12px] border border-admin-line px-6 py-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="flex items-center gap-2.5 font-space-body text-2xs font-semibold tracking-[0.16em] text-admin-accent-ink uppercase">
            <span aria-hidden="true" className={cn(adminChipSolid, "size-7")}>
              <Icon className="size-4" />
            </span>
            {eyebrow}
          </p>
        )}
        <h1 className="mt-4 font-space-display text-4xl leading-[1.05] font-medium tracking-[-0.02em] text-balance text-admin-ink md:text-[2.75rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl font-space-body text-sm leading-relaxed text-admin-ink-soft/75 md:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
