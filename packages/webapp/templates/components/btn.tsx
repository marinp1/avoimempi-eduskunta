/** @jsxImportSource ../../src/jsx */

interface Props {
  /** Button label text. */
  text: string;
  /** When set, renders an `<a>` instead of a `<button>`. */
  href?: string;
  /** CSS modifier class suffix (e.g. `"ghost"` → `btn--ghost`). */
  modifier?: string;
}

/** Renders either a `<button>` or an `<a>` styled as a button. */
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
