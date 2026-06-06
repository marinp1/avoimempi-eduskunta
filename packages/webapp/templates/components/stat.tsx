/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";

interface Props {
  /** Stat label (shown above the value). */
  label: string;
  /** Numeric or string value. */
  value: string | number;
  /** Optional CSS modifier appended to `stat__value`. */
  modifier?: string;
}

/** Single stat block: label and prominent value. */
export default function Stat({ label, value, modifier }: Props) {
  return (
    <div class="stat">
      <div class="stat__label">{label}</div>
      <div class={clsx("stat__value", modifier)}>{value}</div>
    </div>
  );
}
