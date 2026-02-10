import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fi from "./locales/fi.json";

i18n.use(initReactI18next).init({
  resources: {
    fi: fi,
  },
  lng: "fi", // Default language
  fallbackLng: "fi",
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export default i18n;
