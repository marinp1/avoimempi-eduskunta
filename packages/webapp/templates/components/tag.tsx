/** @jsxImportSource ../../src/jsx */

interface Props {
  /** Tag label text. */
  text: string;
  /** CSS modifier class suffix (e.g. `"hall"`, `"opp"`, `"ghost"`). */
  modifier: string;
}

/** Inline tag badge for party bloc or status labels. */
export default function Tag({ text, modifier }: Props) {
  return <span class={`tag tag--${modifier}`}>{text}</span>;
}
