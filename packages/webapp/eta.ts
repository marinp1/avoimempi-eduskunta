import { fileURLToPath } from "node:url";
import { Eta } from "eta";

export const eta = new Eta({
  views: fileURLToPath(new URL("./templates/", import.meta.url)),
  // In dev, re-read templates from disk on every render (enables hot-reload without server restart).
  // In production, compile once and cache for performance.
  cache: process.env.NODE_ENV === "production",
  autoEscape: true,
});

export interface LayoutOptions {
  activePath: string;
  title?: string;
  assetVersion?: string;
}

export function renderFullPage(
  fragment: string,
  options: LayoutOptions,
): string {
  return eta.render("layout", {
    content: fragment,
    ...options,
    finnishDate: new Date().toLocaleDateString("fi-FI", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  });
}

export function htmlResponse(
  req: Request,
  fragment: string,
  options: LayoutOptions,
): Response {
  const isHtmx = req.headers.get("HX-Request") === "true";
  const body = isHtmx ? fragment : renderFullPage(fragment, options);
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Vary: "HX-Request",
    },
  });
}
