import "i18next";
import type { Namespace } from "./i18n";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    ns: Namespace;
    returnNull: false;
    returnEmptyString: false;
  }
}
