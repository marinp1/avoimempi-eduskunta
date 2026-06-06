/** @jsxImportSource ../../src/jsx */

interface Props {
  text: string;
  modifier: string;
}

export default function Spill({ text, modifier }: Props) {
  return (
    <span class={`spill spill--${modifier}`}>
      {modifier === "live" && <span class="ld"></span>}
      {text}
    </span>
  );
}
