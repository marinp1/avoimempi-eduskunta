Archived scripts kept for historical/one-off use during transition from
page-file storage to DB row-store pipelines.

These are not part of the normal DB-driven workflow:

- `validate-dataset.ts`
  Validates legacy `data/raw|parsed/<Table>/page_*.json` files and checks
  duplicate PKs across files.

- `fetch-images.mts`
  Legacy static helper for manual person-image URL checks.

If needed, these can be removed once old page-file audits are no longer used.
