/**
 * Highlight search matches in plain text for research grids.
 */

import type { ReactNode } from "react";

export function highlightSearchText(
  text: string,
  query: string
): ReactNode {
  const q = query.trim();
  if (!q || !text) return text;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = lower.indexOf(needle, cursor);
  let key = 0;
  while (index >= 0) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark
        key={`hl-${key++}`}
        className="rounded-sm bg-accent/25 px-0.5 text-inherit"
      >
        {text.slice(index, index + needle.length)}
      </mark>
    );
    cursor = index + needle.length;
    index = lower.indexOf(needle, cursor);
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts.length > 0 ? parts : text;
}
