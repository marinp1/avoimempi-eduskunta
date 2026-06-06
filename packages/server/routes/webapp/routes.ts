import { cssAsset, jsAsset } from "./assets";
import { createEdustajaRoute } from "./edustaja-route";
import { createEdustajatRoute } from "./edustajat-route";
import { createIstunnotRoute } from "./istunnot-route";
import { createSimplePageRoutes } from "./simple-routes";
import type { HomeRepository } from "../../database/repositories/home-repository";
import type { PersonRepository } from "../../database/repositories/person-repository";
import type { SessionRepository } from "../../database/repositories/session-repository";

export function createWebappStaticRoutes() {
  return {
    "/webapp/setup.js": jsAsset,
    "/webapp/styles.css": cssAsset,
  } as const;
}

export interface WebappDeps {
  homeRepository: HomeRepository;
  personRepository: PersonRepository;
  sessionRepository: SessionRepository;
}

export function createWebappPageRoutes(deps: WebappDeps) {
  return {
    ...createEdustajaRoute(deps),
    ...createEdustajatRoute(deps),
    ...createIstunnotRoute(deps),
    ...createSimplePageRoutes(deps),
  } as const;
}
