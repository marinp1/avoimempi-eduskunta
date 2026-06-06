import Layout from "./templates/layout";

export interface LayoutOptions {
  activePath: string;
  title?: string;
  assetVersion?: string;
}

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

export function fragmentResponse(html: string): Response {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Vary: "HX-Request",
    },
  });
}

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
