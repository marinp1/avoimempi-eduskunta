/** @jsxImportSource ../../src/jsx */

interface Props {
  label: string;
  value: string | number;
  modifier?: string;
}

export default function Stat({ label, value, modifier }: Props) {
  return (
    <div class="stat">
      <div class="stat__label">{label}</div>
      <div class={`stat__value${modifier ? ` ${modifier}` : ""}`}>{value}</div>
    </div>
  );
}
