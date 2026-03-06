# Project Issues

## 1. Constrain local storage keys to the configured base directory

- Severity: Low
- Type: Bug
- Reference: `packages/shared/storage/providers/local.ts`

Problem:
`LocalStorageProvider` maps storage keys with `path.join(this.baseDir, key)` and does not verify that the resolved path stays inside `baseDir`.

Risk:
Malformed or unexpected keys can escape the storage root and read or overwrite arbitrary files accessible to the process.

Acceptance Criteria:
- Normalize and resolve the target path before use.
- Reject keys whose resolved path is outside `baseDir`.
- Apply the same check to `put`, `putFile`, `getFile`, `get`, `exists`, `delete`, and `metadata`.
- Add tests for `..` segments and absolute-path inputs.

## 2. Stop exposing internal error details in HTTP 500 responses

- Severity: Medium
- Type: Bug
- Reference: `packages/server/index.ts`

Problem:
The global server error handler returns `error.message` to clients.

Risk:
Leaks internal implementation details such as SQL errors, file paths, and operational internals.

Acceptance Criteria:
- Return a generic 500 body such as `Internal Server Error`.
- Keep detailed error information in server logs only.
- Review readiness/error endpoints for similar leakage.
- Add a test asserting internal exception messages are not returned to clients.

## 3. Evict expired cache entries before enforcing response-cache capacity

- Severity: Medium
- Type: Bug
- Reference: `packages/server/cache/response-cache.ts`

Problem:
`createResponseCache()` stops inserting new entries once `store.size >= maxEntries`, but expired entries are only removed on lookup.

Risk:
The cache can become permanently saturated for unseen routes and stop caching new responses even after TTL expiry.

Acceptance Criteria:
- Purge expired entries before checking `maxEntries`.
- Add a test covering recovery after TTL expiry when capacity was previously full.
- Preserve current behavior of not caching 5xx responses.

## 4. Tighten TypeScript strictness across the monorepo

- Severity: Medium
- Type: Bug
- Reference: `tsconfig.json`

Problem:
Root TypeScript config disables `strict` and `noImplicitAny`.

Risk:
Schema drift and transformation errors in the ETL and API layers can compile without useful type failures.

Acceptance Criteria:
- Enable `noImplicitAny`.
- Move toward `strict: true`, either globally or package-by-package.
- Fix resulting type errors in server, datapipe, shared, and client code.
- Prevent regression with CI typecheck remaining green.

## 5. Align operator and contributor documentation with the current storage model

- Severity: Low
- Type: Maintenance
- References: `AGENTS.md`

Problem:
Docs still mention `.issues` and JSON page-file storage, while the active pipeline uses SQLite row stores and `.issues` is absent.

Acceptance Criteria:
- Remove or fix `.issues` guidance.
- Update storage architecture text to match `raw.db` / `parsed.db`.
- Ensure root docs and agent docs do not contradict each other.
