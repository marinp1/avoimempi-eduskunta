/** @jsxImportSource ../../src/jsx */

interface Props {
  text: string;
  href?: string;
  modifier?: string;
}

export default function Btn({ text, href, modifier }: Props) {
  const cls = `btn${modifier ? ` btn--${modifier}` : ""}`;
  return href ? (
    <a class={cls} href={href}>
      {text}
    </a>
  ) : (
    <button class={cls}>{text}</button>
  );
}
