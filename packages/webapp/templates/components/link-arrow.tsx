/** @jsxImportSource ../../src/jsx */

interface Props {
  text: string;
  href?: string;
}

export default function LinkArrow({ text, href }: Props) {
  return href ? (
    <a class="link-arrow" href={href}>
      {text}
    </a>
  ) : (
    <span class="link-arrow">{text}</span>
  );
}
