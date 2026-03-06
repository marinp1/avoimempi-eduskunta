import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultNS, resources } from "./resources";

i18n.use(initReactI18next).init({
  resources,
  lng: "fi",
  fallbackLng: "fi",
  defaultNS,
  nsSeparator: ":",
  keySeparator: ".",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
