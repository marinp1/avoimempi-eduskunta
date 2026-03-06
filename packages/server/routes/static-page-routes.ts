export const createStaticPageRoutes = (homepage: Bun.HTMLBundle) => ({
  "/": homepage,
  "/edustajat": homepage,
  "/puolueet": homepage,
  "/istunnot": homepage,
  "/aanestykset": homepage,
  "/asiakirjat": homepage,
  "/analytiikka": homepage,
});
