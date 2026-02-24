# Government Data Exceptions

This file documents known historical anomalies between:

- Official Finnish Government timelines (Valtioneuvosto)
- Imported `GovernmentMembership` and derived party-coalition mapping in this repository

Reference source:
- https://valtioneuvosto.fi/hallitukset-ja-ministerit/hallitukset

## 1) Government Range Mismatches

These governments currently have start/end range values in DB that do not match official ranges exactly.

- `Ingman`
- `Kallio II`
- `Kallio IV`
- `Paasikivi III`
- `Kekkonen`
- `Kekkonen IV`
- `von Fieandt`

Notes:
- These are tracked in `packages/server/__tests__/sanity.test.ts` as `KNOWN_GOVERNMENT_RANGE_MISMATCHES`.
- Tests still validate all official governments and only tolerate these explicit anomalies.

## 2) No Coalition Mapping in PARTY_SUMMARY

For the following governments, `PARTY_SUMMARY` can return zero coalition parties even though government rows exist:

- `Aura II`
- `Aura`
- `Lehto`
- `von Fieandt`
- `Cajander`

Reason:
- No overlapping linkage from `GovernmentMembership` to `ParliamentaryGroupMembership` for these windows in current data.
- This blocks party-level coalition reconstruction for those governments.

Notes:
- These are tracked in `packages/server/__tests__/sanity.test.ts` as `KNOWN_PARTY_SUMMARY_NO_COALITION`.
- Any new no-coalition government outside this list fails tests.
