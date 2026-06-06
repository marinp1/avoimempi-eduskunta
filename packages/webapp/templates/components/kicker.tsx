/** @jsxImportSource ../../src/jsx */

interface Props {
  text: string;
  modifier?: string;
  dot?: boolean;
}

export default function Kicker({ text, modifier, dot }: Props) {
  return (
    <p class={`kicker${modifier ? ` kicker--${modifier}` : ""}`}>
      {dot && <span class="dot"></span>}
      {text}
    </p>
  );
}
