import type { HTMLAttributes, KeyboardEvent, MouseEvent } from "react";

import { adminRow, adminRowOpen } from "./styles";

/**
 * The props that turn a table row into a disclosure.
 *
 * A row is the widest, easiest target on a table, so every admin table folds its
 * detail panel out of one. But a `<tr>` is not a control: it takes no focus and
 * answers to no key. These props make the row operable from the keyboard
 * (`tabIndex` plus Enter/Space), say what it is to a screen reader
 * (`aria-expanded`, with `aria-controls` pointing at the panel it opens), and keep
 * the row from stealing the click of a control that lives inside it.
 */
export function adminRowDisclosure({
  expanded,
  onToggle,
  detailId,
}: {
  expanded: boolean;
  onToggle: () => void;
  detailId: string;
}): Pick<
  HTMLAttributes<HTMLTableRowElement>,
  "className" | "tabIndex" | "aria-expanded" | "aria-controls" | "onClick" | "onKeyDown"
> {
  return {
    className: expanded ? adminRowOpen : adminRow,
    tabIndex: 0,
    "aria-expanded": expanded,
    "aria-controls": detailId,
    onClick: (event: MouseEvent<HTMLTableRowElement>) => {
      // A control inside the row belongs to itself: picking a status from a
      // select should change the status, not fold the row behind it.
      if ((event.target as HTMLElement).closest("button, select, input, a, label")) {
        return;
      }
      onToggle();
    },
    onKeyDown: (event: KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        // Space would otherwise scroll the panel instead of opening the row.
        event.preventDefault();
        onToggle();
      }
    },
  };
}
