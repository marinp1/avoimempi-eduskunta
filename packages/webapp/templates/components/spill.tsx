/** @jsxImportSource ../../src/jsx */

interface Props {
  /** Label text. */
  text: string;
  /** CSS modifier class suffix (e.g. `"live"`, `"done"`, `"draft"`). */
  modifier: string;
}

/** Status badge / spill element for labelling live, done, or draft state. */
export default function Spill({ text, modifier }: Props) {
  return (
    <span class={`spill spill--${modifier}`}>
      {modifier === "live" && <span class="ld"></span>}
      {text}
    </span>
  );
}
