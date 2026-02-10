import type fi from "../i18n/locales/fi.json";

declare module "i18next" {
  interface CustomTypeOptions {
    nsSeparator: ".";
    resources: typeof fi;
  }
}
