import Aanestykset from "../../../webapp/templates/pages/aanestykset";
import Analytiikka from "../../../webapp/templates/pages/analytiikka";
import Asiakirjat from "../../../webapp/templates/pages/asiakirjat";
import Hallitukset from "../../../webapp/templates/pages/hallitukset";
import Home from "../../../webapp/templates/pages/home";
import Muutokset from "../../../webapp/templates/pages/muutokset";
import Puolueet from "../../../webapp/templates/pages/puolueet";
import { htmlResponse } from "../../../webapp/eta";
import { page } from "./helpers";
import { assetVersion } from "./assets";
import type { WebappDeps } from "./deps";

export function createSimplePageRoutes(deps: WebappDeps) {
  return {
    "/": {
      GET: async (req: Request) => {
        const data = await deps.homeRepository.fetchOverview({});
        return page(req, Home({ title: "Etusivu", data }), "/", "Etusivu");
      },
    },
    "/puolueet": {
      GET: (req: Request) =>
        page(req, Puolueet({ title: "Puolueet" }), "/puolueet", "Puolueet"),
    },
    "/aanestykset": {
      GET: (req: Request) =>
        page(
          req,
          Aanestykset({ title: "Äänestykset" }),
          "/aanestykset",
          "Äänestykset",
        ),
    },
    "/asiakirjat": {
      GET: (req: Request) =>
        page(
          req,
          Asiakirjat({ title: "Asiakirjat" }),
          "/asiakirjat",
          "Asiakirjat",
        ),
    },
    "/hallitukset": {
      GET: (req: Request) =>
        page(
          req,
          Hallitukset({ title: "Hallitukset" }),
          "/hallitukset",
          "Hallitukset",
        ),
    },
    "/analytiikka": {
      GET: (req: Request) =>
        page(
          req,
          Analytiikka({ title: "Analytiikka" }),
          "/analytiikka",
          "Analytiikka",
        ),
    },
    "/muutokset": {
      GET: (req: Request) =>
        page(req, Muutokset({ title: "Muutokset" }), "/muutokset", "Muutokset"),
    },
    "/laadunvalvonta": {
      GET: (req: Request) =>
        htmlResponse(
          req,
          `<title>Laadunvalvonta — Eduskuntapeili</title>
<section class="page-hero"><h1>Laadunvalvonta</h1></section>`,
          {
            activePath: "/laadunvalvonta",
            title: "Laadunvalvonta",
            assetVersion,
          },
        ),
    },
  } as const;
}
