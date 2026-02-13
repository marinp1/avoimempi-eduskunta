# Sanity constraints

`sanity-constraints.yaml` is the human-maintained source of truth for sanity check definitions.
The file is validated by `sanity-constraints.schema.json` (IDE + loader validation).

Each constraint entry includes:
- `id` - Stable identifier for the constraint
- `name` - Must match the emitted check name
- `category` and `description` - User-facing metadata
- `query_keys` - Optional references to keys in `sanityQueries`
- `query_refs` - Optional references to query builders/constants
- `params` - Optional configurable values for constraint logic (for example `min_count`)

The server validates the YAML at startup and exposes this metadata in `/api/status/sanity-checks`.

Adding a new constraint is easiest when done in this order:
1. Add or update the check implementation in `packages/server/services/sanity-checks.ts`.
2. Add one YAML entry in `sanity-constraints.yaml` with matching `name`.
3. Link any SQL key via `query_keys` and optional tuning values via `params`.
4. Run `bun test packages/server/__tests__/sanity-constraint-definitions.test.ts`.

Notes:
- `name` is the join key between runtime checks and YAML metadata.
- Unknown `query_keys` fail fast during YAML load.
- Missing or unused YAML definitions fail tests.
