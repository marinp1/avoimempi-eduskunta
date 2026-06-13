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

/** Escapes HTML metacharacters in text content and attribute values. */
function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Marker for already-rendered HTML. Children of this type are emitted as-is;
 * everything else is escaped. All jsx() output is wrapped in SafeHtml, so
 * nested elements compose without double-escaping. Extends String so that
 * code typed against `string` can still call string methods on jsx output.
 */
export class SafeHtml extends String {
  get html(): string {
    return this.valueOf();
  }
}

/**
 * Marks a string as trusted, pre-rendered HTML so the runtime will not escape
 * it when used as a JSX child. Only use for markup assembled by our own
 * HTML-builder helpers — never for request- or API-derived data.
 *
 * Typed as `string` (like jsx() itself) so trusted fragments slot into the
 * string-based template plumbing unchanged.
 */
export function trustedHtml(html: string): string {
  return new SafeHtml(html) as unknown as string;
}

/**
 * Recursively renders a child node to HTML. Plain strings and numbers are
 * escaped; SafeHtml (jsx output, trustedHtml) passes through raw.
 */
function renderChild(child: unknown): string {
  if (child == null || child === false) {
    return "";
  }

  if (child instanceof SafeHtml) {
    return child.html;
  }

  if (Array.isArray(child)) {
    return child.map(renderChild).join("");
  }

  return escapeHtml(child);
}

/**
 * Wraps a function component's return value as trusted HTML. Components are
 * code (not data), and several assemble raw markup via template literals.
 */
function trustComponentResult(result: unknown): string {
  if (result instanceof SafeHtml) {
    return result as unknown as string;
  }
  return trustedHtml(result == null || result === false ? "" : String(result));
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
    return trustedHtml(renderChild(props.children));
  }

  if (typeof tag === "function") {
    return trustComponentResult(tag(props));
  }

  const attrs: string[] = [];
  let children = "";
  let rawInnerHtml: string | null = null;

  for (const [key, value] of Object.entries(props)) {
    if (key === "children") {
      children = renderChild(value);
      continue;
    }

    if (key === "dangerouslySetInnerHTML") {
      rawInnerHtml = String((value as { __html?: unknown })?.__html ?? "");
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

  if (rawInnerHtml !== null) {
    children = rawInnerHtml;
  }

  const attrString = attrs.length > 0 ? " " + attrs.join(" ") : "";

  if (VOID_ELEMENTS.has(tag)) {
    return trustedHtml(`<${tag}${attrString}>`);
  }

  return trustedHtml(`<${tag}${attrString}>${children}</${tag}>`);
}

export const jsxs = jsx;
