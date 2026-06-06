import {
  htmlResponse,
  renderFullPage,
} from "../../../webapp/eta";
import { assetVersion } from "./assets";

export function page(
  req: Request,
  fragment: string,
  activePath: string,
  title?: string,
): Response {
  return htmlResponse(req, fragment, { activePath, title, assetVersion });
}

export function personNotFoundResponse(req: Request, path: string): Response {
  const isHtmx = req.headers.get("HX-Request") === "true";
  const fragment = notFoundFragment(path);
  const body = isHtmx
    ? fragment
    : renderFullPage(fragment, {
        activePath: "/edustajat",
        title: "Sivua ei löydy",
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

function notFoundFragment(path: string): string {
  return `<title>Sivua ei löydy — Eduskuntapeili</title>
<section class="page-head wrap">
    <h1>Sivua ei löydy</h1>
    <p class="sub">Polkua <code>${path}</code> ei löydy.</p>
    <p><a href="/">Palaa etusivulle</a></p>
</section>`;
}
