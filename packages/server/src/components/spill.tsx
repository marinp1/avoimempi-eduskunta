/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";

interface Props {
  /** Label text. */
  text: string;
  /** CSS modifier class suffix (e.g. `"live"`, `"done"`, `"draft"`). */
  modifier: string;
}

/** Status badge / spill element for labelling done or draft state. */
export default function Spill({ text, modifier }: Props) {
  return (
    <span class={clsx("spill", `spill--${modifier}`)}>
      {text}
    </span>
  );
}
