/** @jsxImportSource ../../src/jsx */

interface Props {
  /** Link label text. */
  text: string;
  /** When set, wraps text in an `<a>`; otherwise renders as a `<span>`. */
  href?: string;
}

/** Arrow-styled inline link or text (used for "→" navigational cues). */
export default function LinkArrow({ text, href }: Props) {
  return href ? (
    <a class="link-arrow" href={href}>
      {text}
    </a>
  ) : (
    <span class="link-arrow">{text}</span>
  );
}
