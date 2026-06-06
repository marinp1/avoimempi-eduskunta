import i18next from "i18next";
import common from "./locales/fi/common.json";
import nav from "./locales/fi/nav.json";
import home from "./locales/fi/home.json";
import edustajat from "./locales/fi/edustajat.json";
import aanestykset from "./locales/fi/aanestykset.json";
import istunnot from "./locales/fi/istunnot.json";
import puolueet from "./locales/fi/puolueet.json";
import asiakirjat from "./locales/fi/asiakirjat.json";
import errors from "./locales/fi/errors.json";
import componentsNs from "./locales/fi/components.json";

export const NS = [
  "common",
  "nav",
  "home",
  "edustajat",
  "aanestykset",
  "istunnot",
  "puolueet",
  "asiakirjat",
  "errors",
  "components",
] as const;

export type Namespace = (typeof NS)[number];

await i18next.init({
  resources: {
    fi: {
      common,
      nav,
      home,
      edustajat,
      aanestykset,
      istunnot,
      puolueet,
      asiakirjat,
      errors,
      components: componentsNs,
    },
  },
  lng: "fi",
  fallbackLng: "fi",
  ns: NS as unknown as string[],
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
  returnEmptyString: false,
});

export default i18next;
