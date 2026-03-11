# Finnish Translation Reviewer Memory

## Established Term Choices
- Navigation uses "Kansanedustajat"; internal references use "edustaja/edustajia" -- intentional and correct
- Voting values from DB: "Jaa", "Ei", "Tyhjää", "Poissa" -- hardcoded in Composition/Details.tsx
- "Hallituskausi" used consistently for government period
- "Puoluekuri" for party discipline -- correct term
- "Täysistunto" for plenary session (sessions subtitle)
- "Tietojen tuonti" replaces "migraatio/migraattori" in user-facing text (applied 2026-03-10)
- "Hallituspuolueet" replaces "Koalitio" in hallitukset section (applied 2026-03-10)
- "Rivejä sivulla:" replaces "Rivejä per sivu:" (applied 2026-03-10)
- "sortBy" key intentionally includes colon -- it's a label before sort buttons

## Issues Fixed (2026-03-10 batch)
All previously listed known issues have been corrected. See `correction-log.md` for full list.

## Pattern Notes
- Pluralization (_one/_other) is correctly implemented throughout
- fi.json is the only locale file (Finnish-only app)
- Translation keys are well-organized by page/section
- Some strings in Composition/Details.tsx are hardcoded Finnish, not using i18n keys
- Front page register is intentionally slightly more casual but should avoid slang
- Passive voice preferred over first-person ("näytetään" not "näytämme")

## File Locations
- Main translation file: `packages/client/i18n/locales/fi.json`
- i18n setup: `packages/client/i18n/index.ts`, `resources.ts`, `scoped.ts`
