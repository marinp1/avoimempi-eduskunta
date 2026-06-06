import { cssAsset, jsAsset } from "./assets";
import { createAanestysRoute } from "./aanestys-route";
import { createAanestyksetListRoute } from "./aanestykset-list-route";
import { createAnalytiikkaRoute } from "./analytiikka-route";
import { createAsiakirjaRoute } from "./asiakirja-route";
import { createAsiakirjatListRoute } from "./asiakirjat-list-route";
import { createAsiakohtaRoute } from "./asiakohta-route";
import { createEdustajaRoute } from "./edustaja-route";
import { createEdustajatRoute } from "./edustajat-route";
import { createHallituksetRoute } from "./hallitukset-route";
import { createHomeRoute } from "./home-route";
import { createIstunnotRoute } from "./istunnot-route";
import { createIstuntoRoute } from "./istunto-route";
import { createKeskusteluRoute } from "./keskustelu-route";
import { createLaadunvalvontaRoute } from "./laadunvalvonta-route";
import { createMuutoksetRoute } from "./muutokset-route";
import { createPuolueRoute } from "./puolue-route";
import { createPuolueetListRoute } from "./puolueet-list-route";
import type { WebappDeps } from "./deps";

export function createWebappStaticRoutes() {
  return {
    "/webapp/setup.js": jsAsset,
    "/webapp/styles.css": cssAsset,
  } as const;
}

export type { WebappDeps } from "./deps";

export function createWebappPageRoutes(deps: WebappDeps) {
  return {
    ...createAanestysRoute(deps),
    ...createAanestyksetListRoute(deps),
    ...createAnalytiikkaRoute(deps),
    ...createAsiakirjaRoute(deps),
    ...createAsiakirjatListRoute(deps),
    ...createAsiakohtaRoute(deps),
    ...createEdustajaRoute(deps),
    ...createEdustajatRoute(deps),
    ...createHallituksetRoute(deps),
    ...createHomeRoute(deps),
    ...createIstunnotRoute(deps),
    ...createIstuntoRoute(deps),
    ...createKeskusteluRoute(deps),
    ...createLaadunvalvontaRoute(deps),
    ...createMuutoksetRoute(deps),
    ...createPuolueRoute(deps),
    ...createPuolueetListRoute(deps),
  } as const;
}
