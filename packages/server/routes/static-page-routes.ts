export const createStaticPageRoutes = (homepage: unknown, isDev: boolean) => ({
  "/": homepage,
  "/edustajat": homepage,
  "/puolueet": homepage,
  "/istunnot": homepage,
  "/aanestykset": homepage,
  "/asiakirjat": homepage,
  "/analytiikka": homepage,
  "/composition": homepage,
  "/votings": homepage,
  "/sessions": homepage,
  "/insights": homepage,
  ...(isDev
    ? {
        "/tila": homepage,
        "/status": homepage,
      }
    : {}),
});
