import { useTranslation } from "react-i18next";
import type { TranslationNamespace } from "./resources";

export const useScopedTranslation = <Prefix extends TranslationNamespace>(
  keyPrefix: Prefix,
) => useTranslation("translations", { keyPrefix });
