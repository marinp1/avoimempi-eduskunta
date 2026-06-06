// DEPRECATED — superseded by createWebappRoutes() in webapp-routes.ts.
// Kept for reference; not registered in index.ts.
export const createStaticPageRoutes = (homepage: Bun.HTMLBundle) => {
  return {
    "/": homepage,
    "/edustajat": homepage,
    "/puolueet": homepage,
    "/istunnot": homepage,
    "/aanestykset": homepage,
    "/asiakirjat": homepage,
    "/analytiikka": homepage,
    "/hallitukset": homepage,
    "/muutokset": homepage,
    "/laadunvalvonta": homepage,
    "/edustaja/*": homepage,
  };
};
