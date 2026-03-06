import fi from "./locales/fi.json";

export const defaultNS = "translations" as const;

export const resources = {
  fi: {
    [defaultNS]: fi,
  },
} as const;

export type TranslationResources = (typeof resources)["fi"];
export type TranslationTree = typeof fi;
export type TranslationNamespace = keyof TranslationTree;
