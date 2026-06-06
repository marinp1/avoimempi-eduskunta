/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";

interface Props {
  label: string;
  value: string | number;
  modifier?: string;
  data?: Record<string, string>;
}

export default function Stat({ label, value, modifier, data }: Props) {
  return (
    <div class="stat">
      <div class="stat__label">{label}</div>
      <div class={clsx("stat__value", modifier)} {...(data ?? {})}>
        {value}
      </div>
    </div>
  );
}
