# Internationalization (i18n) Setup

This directory contains the internationalization configuration for the Avoimempi Eduskunta application.

## Overview

The application uses [i18next](https://www.i18next.com/) and [react-i18next](https://react.i18next.com/) for internationalization. Currently, only Finnish language is supported.

## Structure

```
i18n/
├── index.ts           # i18n configuration and initialization
├── locales/
│   └── fi.json        # Finnish translations
└── README.md          # This file
```

## Usage

### In Components

Import `useTranslation` hook from `react-i18next`:

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t("app.title")}</h1>
      <p>{t("app.subtitle")}</p>
    </div>
  );
}
```

### Translation Keys

Translation keys are organized hierarchically:

- `app.*` - Application-wide strings (title, subtitle, disclaimers)
- `navigation.*` - Navigation menu and routes
- `common.*` - Common UI elements (buttons, labels, etc.)
- `errors.*` - Error messages
- `composition.*` - Composition/Member page
- `votings.*` - Votings page
- `sessions.*` - Sessions page
- `agenda.*` - Agenda page
- `insights.*` - Insights/Analytics pages
- `muutokset.*` - Changes/update history page

### Adding New Translations

1. Add the translation key and value to `locales/fi.json`
2. Use the translation in your component via `t('your.key.here')`

Example:
```json
{
  "myFeature": {
    "title": "Ominaisuuden otsikko",
    "description": "Ominaisuuden kuvaus"
  }
}
```

```tsx
const { t } = useTranslation();
<h2>{t("myFeature.title")}</h2>
```

### Interpolation

You can use interpolation for dynamic values:

```json
{
  "greeting": "Tervetuloa, {{name}}!"
}
```

```tsx
t("greeting", { name: "Matti" }) // "Tervetuloa, Matti!"
```

## Language Configuration

The application is configured to use Finnish (`fi`) as the default and fallback language. This is set in `i18n/index.ts`:

```typescript
i18n.use(initReactI18next).init({
  resources: {
    fi: {
      translation: fi,
    },
  },
  lng: "fi", // Default language
  fallbackLng: "fi",
  // ...
});
```

## HTML Language Attribute

The HTML `lang` attribute is set to `"fi"` in `packages/server/public/index.html`:

```html
<html lang="fi">
```

## Future Enhancements

While only Finnish is currently supported, the infrastructure is in place to add additional languages in the future:

1. Create new translation files (e.g., `locales/en.json`, `locales/sv.json`)
2. Add them to the i18n configuration in `i18n/index.ts`
3. Implement language switching UI if needed

## Notes

- All user-facing text should use translation keys, not hardcoded strings
- Keep translation keys semantic and hierarchical
- Document any new translation namespaces in this README
- Existing Finnish strings in components have been preserved in translations
