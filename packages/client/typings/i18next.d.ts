import type { defaultNS, TranslationResources } from "../i18n/resources";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    nsSeparator: ":";
    keySeparator: ".";
    resources: TranslationResources;
  }
}
