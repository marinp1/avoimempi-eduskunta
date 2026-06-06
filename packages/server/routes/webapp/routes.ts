import { cssAsset, jsAsset } from "./assets";
import { createVotingRoute } from "./voting-route";
import { createVotingMapRoute } from "./voting-map-route";
import { createVotingsListRoute } from "./votings-list-route";
import { createAnalyticsRoute } from "./analytics-route";
import { createDocumentRoute } from "./document-route";
import { createDocumentsListRoute } from "./documents-list-route";
import { createAgendaItemRoute } from "./agenda-item-route";
import { createPersonRoute } from "./person-route";
import { createPersonSpeechesRoute } from "./person-speeches-route";
import { createRosterRoute } from "./roster-route";
import { createGovernmentsRoute } from "./governments-route";
import { createHomeRoute } from "./home-route";
import { createSessionsListRoute } from "./sessions-list-route";
import { createSessionRoute } from "./session-route";
import { createDebateRoute } from "./debate-route";
import { createDataQualityRoute } from "./data-quality-route";
import { createChangesRoute } from "./changes-route";
import { createPartyRoute } from "./party-route";
import { createPartiesListRoute } from "./parties-list-route";
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
    ...createVotingRoute(deps),
    ...createVotingMapRoute(deps),
    ...createVotingsListRoute(deps),
    ...createAnalyticsRoute(deps),
    ...createDocumentRoute(deps),
    ...createDocumentsListRoute(deps),
    ...createAgendaItemRoute(deps),
    ...createPersonRoute(deps),
    ...createPersonSpeechesRoute(deps),
    ...createRosterRoute(deps),
    ...createGovernmentsRoute(deps),
    ...createHomeRoute(deps),
    ...createSessionsListRoute(deps),
    ...createSessionRoute(deps),
    ...createDebateRoute(deps),
    ...createDataQualityRoute(deps),
    ...createChangesRoute(deps),
    ...createPartyRoute(deps),
    ...createPartiesListRoute(deps),
  } as const;
}
