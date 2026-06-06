import Layout from "./layouts/base";
import type { TimelineData } from "./layouts/timeline";
import type { PeriodSelectorData } from "./helpers/period-selector-data";

/** Options for configuring the HTML layout wrapper. */
export interface LayoutOptions {
  /** Current navigation path, used to highlight the active nav item. */
  activePath: string;
  /** Page title displayed in the browser tab and `<title>` tag. */
  title?: string;
  /** Cache-busting version string for asset URLs. */
  assetVersion?: string;
  /** When provided, renders the time scrubber after the masthead. */
  timelineData?: TimelineData;
  /** When provided, renders the period selector menu with pre-checked state. */
  periodData?: PeriodSelectorData;
}

/**
 * Renders a complete HTML page by wrapping the given content fragment
 * inside the shared layout (masthead, nav, footer).
 */
export function renderFullPage(
  fragment: string,
  options: LayoutOptions,
): string {
  return Layout({
    content: fragment,
    finnishDate: new Date().toLocaleDateString("fi-FI", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    ...options,
  });
}

/**
 * Creates a `Response` containing only the HTML fragment (no layout wrapper).
 * Used by htmx to swap partial page content.
 */
export function fragmentResponse(html: string): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Vary: "HX-Request",
    },
  });
}

/**
 * Creates a full-page or fragment response depending on whether the request
 * originates from an htmx navigation (HX-Request header).
 */
export function htmlResponse(
  req: Request,
  fragment: string,
  options: LayoutOptions,
): Response {
  const isHtmx = req.headers.get("HX-Request") === "true";
  return isHtmx
    ? fragmentResponse(fragment)
    : new Response(renderFullPage(fragment, options), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          Vary: "HX-Request",
        },
      });
}
