# Domain Module

Shared domain value objects and pure functions for the Avoimempi Eduskunta
application. This layer sits **between repository rows and view models** in
the architecture:

```
SQL row → Domain value object → View model → Template
```

## Responsibility

- **Owns parliamentary concepts** as typed value objects and pure functions
- **Defines derivations once** (vote tally, party identity, membership rules)
  so they are not re-derived in each route or view-model builder
- **Accepts row-compatible inputs** — functions are typed against interfaces
  that match repository row shapes from `DatabaseTables.*` / `DatabaseQueries.*`

## What lives here

| Module          | Contents                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `vote.ts`       | `VoteTally`, `VoteCounts`, `buildVoteTally`, `tallyVoteList`, `VoteToken`, `Bloc`, `normalizeVote`, `normalizeBloc` |
| `party.ts`      | `Party` (`{ code, name, color }`), `resolveParty`, `partyColor`, `partyShortName`                                   |
| `membership.ts` | `isCurrentMembership`, `findCurrentGroup`, `findCurrentDistrict`, `DateBounded`                                     |

## Presentation vs. domain boundary

- **Domain** owns the **identity and derivation** of concepts (what a vote outcome
  means, which code belongs to which party, whether a membership is current).
- **Presentation** (view models / templates) owns **rendering** (i18n labels,
  CSS class names, formatting). The `Party.color` property is a CSS `var()`
  reference — a presentation-derived value stored in the domain object for
  convenience, since it is the single source of truth for party identity.

## Usage

```ts
import { buildVoteTally, resolveParty } from "#shared/domain";

// Compose domain primitives in view-model builders
const tally = buildVoteTally({
  nYes: db.n_yes,
  nNo: db.n_no,
  nTotal: db.n_total,
});
const party = resolveParty(row.group_abbreviation);
```

This module is consumed by both server route builders and `/api/*` endpoints
(via `#shared/domain` path alias).
