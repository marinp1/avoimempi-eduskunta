import i18next from "i18next";
import common from "./locales/fi/common.json";
import nav from "./locales/fi/nav.json";
import home from "./locales/fi/home.json";
import persons from "./locales/fi/persons.json";
import votings from "./locales/fi/votings.json";
import sessions from "./locales/fi/sessions.json";
import parties from "./locales/fi/parties.json";
import documents from "./locales/fi/documents.json";
import errors from "./locales/fi/errors.json";
import componentsNs from "./locales/fi/components.json";
import quality from "./locales/fi/quality.json";

export const NS = [
  "common",
  "nav",
  "home",
  "persons",
  "votings",
  "sessions",
  "parties",
  "documents",
  "errors",
  "components",
  "quality",
] as const;

export type Namespace = (typeof NS)[number];

await i18next.init({
  resources: {
    fi: {
      common,
      nav,
      home,
      persons,
      votings,
      sessions,
      parties,
      documents,
      errors,
      components: componentsNs,
      quality,
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
