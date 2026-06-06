/** HTML void elements that must not have closing tags. */
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

/** Escapes HTML metacharacters in attribute values. */
function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Recursively renders a child node (string, number, array, boolean, or null) to HTML. */
function renderChild(child: unknown): string {
  if (child == null || child === false) {
    return "";
  }

  if (Array.isArray(child)) {
    return child.map(renderChild).join("");
  }

  return String(child);
}

/** Fragment sentinel — renders children without a wrapper element. */
export const Fragment = Symbol("Fragment");

/** Custom JSX runtime: converts JSX elements to HTML strings at build time. */
export function jsx(
  tag: string | Function | typeof Fragment,
  props: Record<string, unknown> | null,
): string {
  props ??= {};

  if (tag === Fragment) {
    return renderChild(props.children);
  }

  if (typeof tag === "function") {
    return tag(props);
  }

  const attrs: string[] = [];
  let children = "";

  for (const [key, value] of Object.entries(props)) {
    if (key === "children") {
      children = renderChild(value);
      continue;
    }

    if (value === true) {
      attrs.push(key);
      continue;
    }

    if (value === false || value == null) {
      continue;
    }

    attrs.push(`${key}="${escapeHtml(value)}"`);
  }

  const attrString = attrs.length > 0 ? " " + attrs.join(" ") : "";

  if (VOID_ELEMENTS.has(tag)) {
    return `<${tag}${attrString}>`;
  }

  return `<${tag}${attrString}>${children}</${tag}>`;
}

export const jsxs = jsx;
