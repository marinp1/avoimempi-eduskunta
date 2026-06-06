/** @jsxImportSource ../../src/jsx */

interface Props {
  variant?: "ink" | "soft";
}

export default function Rule({ variant }: Props) {
  if (variant === "ink") return <hr class="rule-ink" />;
  if (variant === "soft") return <hr class="rule-soft" />;
  return <hr class="rule" />;
}
