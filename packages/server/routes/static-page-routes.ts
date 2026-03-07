export const createStaticPageRoutes = (
  homepage: Bun.HTMLBundle,
) => {
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
  };
};
