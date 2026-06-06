import "i18next";
import type { Namespace } from "./i18n";
import type common from "./locales/fi/common.json";
import type nav from "./locales/fi/nav.json";
import type home from "./locales/fi/home.json";
import type edustajat from "./locales/fi/edustajat.json";
import type aanestykset from "./locales/fi/aanestykset.json";
import type istunnot from "./locales/fi/istunnot.json";
import type puolueet from "./locales/fi/puolueet.json";
import type asiakirjat from "./locales/fi/asiakirjat.json";
import type errors from "./locales/fi/errors.json";
import type components from "./locales/fi/components.json";

declare module "i18next" {
  interface CustomTypeOptions {
    ns: Namespace;
    returnNull: false;
    returnEmptyString: false;
    resources: {
      common: typeof common;
      nav: typeof nav;
      home: typeof home;
      edustajat: typeof edustajat;
      aanestykset: typeof aanestykset;
      istunnot: typeof istunnot;
      puolueet: typeof puolueet;
      asiakirjat: typeof asiakirjat;
      errors: typeof errors;
      components: typeof components;
    };
  }
}
