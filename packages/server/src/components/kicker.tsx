/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";

interface Props {
  /** Kicker label text. */
  text: string;
  /** CSS modifier class suffix (e.g. `"red"` → `kicker--red`). */
  modifier?: string;
  /** When true, renders a decorative dot before the text. */
  dot?: boolean;
}

/** Section kicker / overline label (small, uppercase heading above section titles). */
export default function Kicker({ text, modifier, dot }: Props) {
  return (
    <p class={clsx("kicker", modifier && `kicker--${modifier}`)}>
      {dot && <span class="dot"></span>}
      {text}
    </p>
  );
}
