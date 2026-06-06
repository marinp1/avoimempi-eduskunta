/** @jsxImportSource ../../src/jsx */

interface Props {
  text: string;
  modifier: string;
}

export default function Tag({ text, modifier }: Props) {
  return <span class={`tag tag--${modifier}`}>{text}</span>;
}
