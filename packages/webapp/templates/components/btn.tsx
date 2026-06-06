/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";

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
  return href ? (
    <a class={clsx("btn", modifier && `btn--${modifier}`)} href={href}>
      {text}
    </a>
  ) : (
    <button class={clsx("btn", modifier && `btn--${modifier}`)}>{text}</button>
  );
}
