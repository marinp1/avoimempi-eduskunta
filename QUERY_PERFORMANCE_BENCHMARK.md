# Query Performance Benchmark

Measured on `avoimempi-eduskunta.db` (real dataset) using `packages/server/scripts/benchmark-target-queries.ts`.

## Notes

- Runtime DB connections now set `PRAGMA temp_store = MEMORY` to avoid temp-file failures on heavy analytics queries.
- `V001.019__query_performance_indexes.sql` indexes were also applied directly to current DB for measurement.

## Baseline (after query rewrite pass, before index application)

- `sessionSections`: 191.41 ms
- `documentDetail`: 840.29 ms
- `partySummary`: 862.50 ms
- `partyDiscipline`: 1370.31 ms
- `partyParticipationByGovernment`: 4772.70 ms
- `ageDivisionOverTime`: 50.22 ms

## Current (after index application)

- `sessionSections`: 1.65 ms
- `documentDetail`: 0.09 ms
- `partySummary`: 35.94 ms
- `partyDiscipline`: 706.72 ms
- `partyParticipationByGovernment`: 4891.59 ms
- `ageDivisionOverTime`: 27.30 ms

## Delta Summary

- Major improvement:
  - `sessionSections` (roughly 100x faster)
  - `documentDetail` (roughly 9000x faster)
  - `partySummary` (roughly 24x faster)
  - `ageDivisionOverTime` (roughly 2x faster)
- Moderate improvement:
  - `partyDiscipline` (roughly 2x faster)
- No improvement yet:
  - `partyParticipationByGovernment` remains the dominant hotspot and needs further redesign or pre-aggregation.
