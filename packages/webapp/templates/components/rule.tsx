/** @jsxImportSource ../../src/jsx */

interface Props {
  /** Visual variant: `"ink"` (bold) or `"soft"` (subtle); defaults to standard rule. */
  variant?: "ink" | "soft";
}

/** Themed horizontal rule with three visual levels. */
export default function Rule({ variant }: Props) {
  if (variant === "ink") return <hr class="rule-ink" />;
  if (variant === "soft") return <hr class="rule-soft" />;
  return <hr class="rule" />;
}
