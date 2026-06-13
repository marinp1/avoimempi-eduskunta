import "i18next";
import type { Namespace } from "./i18n";
import type common from "./locales/fi/common.json";
import type nav from "./locales/fi/nav.json";
import type home from "./locales/fi/home.json";
import type persons from "./locales/fi/persons.json";
import type votings from "./locales/fi/votings.json";
import type sessions from "./locales/fi/sessions.json";
import type parties from "./locales/fi/parties.json";
import type documents from "./locales/fi/documents.json";
import type errors from "./locales/fi/errors.json";
import type components from "./locales/fi/components.json";
import type quality from "./locales/fi/quality.json";

declare module "i18next" {
  interface CustomTypeOptions {
    ns: Namespace;
    returnNull: false;
    returnEmptyString: false;
    resources: {
      common: typeof common;
      nav: typeof nav;
      home: typeof home;
      persons: typeof persons;
      votings: typeof votings;
      sessions: typeof sessions;
      parties: typeof parties;
      documents: typeof documents;
      errors: typeof errors;
      components: typeof components;
      quality: typeof quality;
    };
  }
}
