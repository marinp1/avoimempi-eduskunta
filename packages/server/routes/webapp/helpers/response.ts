import { renderFullPage, type LayoutOptions } from "#webapp/eta";
import { esc } from "#webapp/templates/helpers";
import { assetVersion } from "../assets";
import { isHtmx } from "#shared-helpers";
import i18next from "i18next";
import { timelineOobHtml } from "./timeline";

/**
 * Describes a narrower fragment to render for targeted htmx swaps (filter
 * updates, timeline scrubbing) instead of the whole page fragment. Selected
 * when the request's HX-Target matches one of `target` and `when` is not false.
 */
export interface PagePartial {
  /** HX-Target substring(s) that select this partial. */
  target: string | string[];
  /** The narrower fragment to render when matched. */
  fragment: string;
  /** Prepend the out-of-band timeline. Defaults to false (partials rarely re-render it). */
  oobTimeline?: boolean;
  /** Extra gate beyond the target match (e.g. a date param being present). Defaults to true. */
  when?: boolean;
}

export interface PageOptions extends Pick<
  LayoutOptions,
  "activePath" | "title" | "timelineData" | "periodData"
> {
  req: Request;
  fragment: string;
  extraHeaders?: Record<string, string>;
  partial?: PagePartial;
}

function partialMatches(req: Request, partial: PagePartial): boolean {
  if (partial.when === false) return false;
  const hxTarget = req.headers.get("HX-Target") ?? "";
  const targets = Array.isArray(partial.target)
    ? partial.target
    : [partial.target];
  return targets.some((t) => hxTarget.includes(t));
}

export function page(opts: PageOptions): Response {
  const htmx = isHtmx(opts.req);
  const baseHeaders: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    Vary: "HX-Request",
  };
  if (opts.extraHeaders) Object.assign(baseHeaders, opts.extraHeaders);
  if (htmx && opts.partial && partialMatches(opts.req, opts.partial)) {
    const tlHtml =
      opts.partial.oobTimeline && opts.timelineData
        ? timelineOobHtml(opts.timelineData)
        : "";
    return new Response(tlHtml + opts.partial.fragment, {
      headers: baseHeaders,
    });
  }
  if (htmx && opts.timelineData) {
    const tlHtml = timelineOobHtml(opts.timelineData);
    return new Response(tlHtml + opts.fragment, { headers: baseHeaders });
  }
  if (htmx) {
    return new Response(opts.fragment, { headers: baseHeaders });
  }
  const fullPage = renderFullPage(opts.fragment, {
    activePath: opts.activePath,
    title: opts.title,
    assetVersion,
    timelineData: opts.timelineData,
    periodData: opts.periodData,
  });
  return new Response(fullPage, { headers: baseHeaders });
}

export interface NotFoundOptions {
  /** Nav path to highlight on the full page. Defaults to `path`. */
  activePath?: string;
  /** Browser/tab title. Defaults to the generic not-found title. */
  title?: string;
  /** Heading shown in the body. Defaults to the generic not-found title. */
  heading?: string;
  /** Description line. Defaults to the generic message interpolating `path`. */
  desc?: string;
  /** Back-link target. Defaults to the home page. */
  backHref?: string;
  /** Back-link label. Defaults to "back to home". */
  backLabel?: string;
}

export function notFoundResponse(
  req: Request,
  path: string,
  opts: NotFoundOptions = {},
): Response {
  const title = opts.title ?? i18next.t("errors:not_found_title");
  const fragment = notFoundFragment(path, opts);
  const htmx = isHtmx(req);
  const body = htmx
    ? fragment
    : renderFullPage(fragment, {
        activePath: opts.activePath ?? path,
        title,
        assetVersion,
      });
  return new Response(body, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Vary: "HX-Request",
    },
  });
}

/** Convenience for the representative profile 404 (keeps the edustajat nav active). */
export function personNotFoundResponse(req: Request, path: string): Response {
  return notFoundResponse(req, path, {
    activePath: "/edustajat",
    title: i18next.t("edustajat:profile.not_found"),
  });
}

function notFoundFragment(path: string, opts: NotFoundOptions = {}): string {
  const title = opts.title ?? i18next.t("errors:not_found_title");
  const heading = opts.heading ?? i18next.t("errors:not_found_title");
  const desc =
    opts.desc ?? i18next.t("errors:not_found_desc", { path: esc(path) });
  const backHref = opts.backHref ?? "/";
  const backLabel = opts.backLabel ?? i18next.t("errors:back_to_home");
  return `<title>${i18next.t("common:page_title_format", { title, brand: i18next.t("common:brand_name") })}</title>
<section class="page-head wrap">
    <h1>${heading}</h1>
    <p class="sub">${desc}</p>
    <p><a href="${backHref}">${backLabel}</a></p>
</section>`;
}
