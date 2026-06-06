import { cssAsset, jsAsset } from "./assets";
import { createAanestysRoute } from "./aanestys-route";
import { createAsiakirjaRoute } from "./asiakirja-route";
import { createAsiakohtaRoute } from "./asiakohta-route";
import { createEdustajaRoute } from "./edustaja-route";
import { createEdustajatRoute } from "./edustajat-route";
import { createIstunnotRoute } from "./istunnot-route";
import { createIstuntoRoute } from "./istunto-route";
import { createKeskusteluRoute } from "./keskustelu-route";
import { createPuolueRoute } from "./puolue-route";
import { createSimplePageRoutes } from "./simple-routes";
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
    ...createAsiakirjaRoute(deps),
    ...createAsiakohtaRoute(deps),
    ...createEdustajaRoute(deps),
    ...createEdustajatRoute(deps),
    ...createIstunnotRoute(deps),
    ...createIstuntoRoute(deps),
    ...createKeskusteluRoute(deps),
    ...createPuolueRoute(deps),
    ...createSimplePageRoutes(deps),
  } as const;
}
