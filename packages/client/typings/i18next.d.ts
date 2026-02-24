import type fi from "../i18n/locales/fi.json";
type Namespace = keyof typeof fi;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: readonly Namespace[];
    nsSeparator: ".";
    resources: typeof fi;
  }
}
