import { cssAsset, jsAsset } from "./assets";
import { createAsiakirjaRoute } from "./asiakirja-route";
import { createEdustajaRoute } from "./edustaja-route";
import { createEdustajatRoute } from "./edustajat-route";
import { createIstunnotRoute } from "./istunnot-route";
import { createIstuntoRoute } from "./istunto-route";
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
    ...createAsiakirjaRoute(deps),
    ...createEdustajaRoute(deps),
    ...createEdustajatRoute(deps),
    ...createIstunnotRoute(deps),
    ...createIstuntoRoute(deps),
    ...createSimplePageRoutes(deps),
  } as const;
}
