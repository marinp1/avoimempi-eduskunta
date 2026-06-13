# Voting context section: mietintö päätösehdotus (JAA) for all votings + richer EI side

## Context

The voting detail page resolves the lausumaehdotus (EI side). The user wants (a) the **other half of the vote** — what "Mietintö JAA" meant — and (b) this context **for all votings where possible**, not just lausumaehdotus votes.

**Data findings (verified read-only):**

- `CommitteeReport.decision_text` (VALIOKUNNAN PÄÄTÖSEHDOTUS) is the JAA side's literal content: present on all 2,765 mietinnöt, short (avg 235 chars, max 2.2 KB), `\n\n`-separated paragraphs with two heading lines at top ("VALIOKUNNAN PÄÄTÖSEHDOTUS", "{X}valiokunnan päätösehdotus:").
- **2,833 votings** map via `Voting.parliamentary_item = CommitteeReport.source_reference` (+ `report_type_code LIKE '%VM'`) to **exactly one** mietintö; 52 map to several (skip as ambiguous). Coverage is bounded by document data: 2025–2026 nearly complete, 2015–2024 partial (many older mietinnöt absent from VaskiData — separate data-completeness issue, out of scope). `idx_committeereport_source_reference` exists (V001.045).
- `doc_tunnuses`/SaliDBDocumentReference reference the source doc (HE/KAA), never the mietintö — `source_reference` is the only join route.
- **141 muutosehdotus votes** ("58 §: mietintö JAA / Eemeli Peltosen ehdotus (vl 1) EI", non-lausuma) match a mietintö; their vastalause text is unstructured, but dissent heading + signers are in `CommitteeReportDissent(+Signer)` — enough for a labeled EI block with a link.

**User-confirmed layout**: stacked blocks — JAA above EI, inside one section, reusing existing classes.

## Step 1 — Data: one new query for the mietintö

New `packages/server/src/features/voting/sql/voting-statement-report.sql`:

```sql
SELECT id, parliament_identifier, decision_text
FROM CommitteeReport
WHERE source_reference = $sourceReference
  AND report_type_code LIKE '%VM'
```

- `$sourceReference` already in DEFAULT_BINDINGS (sql-contract test).
- New `fetchStatementReportRows({ sourceReference })` in `voting.repository.ts` (pattern of `fetchStatementSignerRows`). Returns all rows; service uses the result only when exactly 1 row (consistent with `groupDissentRows`'s multiple-report rule).
- seedFullDataset already seeds CommitteeReport id 700 (source_reference 'KK 100/2024'); add `decision_text` to that insert. Then `bun run test:update-snapshots`.

## Step 2 — Title parser: muutosehdotus form (voting-title.ts)

- New ref kind in `StatementProposalRef`: `{ kind: "muutosehdotus"; proposer: string; dissentNumber: number | null }` parsed from `{proposer} ehdotus (vl N)` / `(vl)` (pattern mirrors VASTALAUSE_PATTERN with `ehdotus` instead of `lausumaehdotus`; ensure `lausumaehdotus`/`monistelausumaehdotus` are tried first — `ehdotus` is a suffix of both, so the new pattern must require whitespace before `ehdotus`).
- New `resolveDissentReference(ref, dissents)` → `{ dissentNumber, dissentHeading } | null` reusing the same `findUnique` dissent-matching rules (number → order fallback; `(vl)` → single dissent, else single-with-statements rule does NOT apply here — just single dissent, else proposer signer match via existing `signerMatchesProposer`, else null).

## Step 3 — Service (voting.service.ts)

`getVotingDetail` passes **two** inputs to `buildSingleVoteData`:

1. `mietinto` (new, independent of title parsing): if `voting.parliamentary_item` set, `fetchStatementReportRows`; exactly 1 row → `{ reportId, reportIdentifier, decisionText }`, else null. This is the all-votings JAA context (2,833 votings).
2. `statementProposal` (existing `resolveStatementProposal`, extended): new branch for `kind: "muutosehdotus"` — fetch proposal+signer rows, group, `resolveDissentReference`; on success return `{ kind: "muutosehdotus", dissentLabel, reportId, reportIdentifier }` (no statement text). No moniste fallback for this kind.
3. The vastalause/plain variants keep their existing fields; the report link info for all EI variants can come from `mietinto` when it matches — but keep them self-contained (they already carry reportId/reportIdentifier) to avoid coupling.

## Step 4 — View model (detail.view-model.ts)

- Pure helper `buildDecisionParagraphs(decisionText: string | null): string[]` — split on `/\n\s*\n/`, trim, drop empties and heading lines (`/^VALIOKUNNAN PÄÄTÖSEHDOTUS$/i`, `/päätösehdotus:$/i`). Export for tests.
- `SingleVoteData` gains sibling field:
  `mietinto: { decisionParagraphs: string[]; reportIdentifier: string; reportUrl: string } | null`
- `statementProposal` union gains `| { kind: "muutosehdotus"; dissentLabel: string; reportIdentifier: string; reportUrl: string }`.

## Step 5 — UI (detail.page.tsx) — stacked JAA/EI blocks

Section renders when `data.mietinto || data.statementProposal` (was: statementProposal only).

- Kicker: `statement_proposal_kicker` copy → **"Äänestysasetelma · mistä äänestettiin"**.
- **JAA block** (when `mietinto`): chip JAA (reuse `.vresult__q .prop .k.j` chip styles from `_votes.css` — verify they apply outside `.vresult__q`; if scoped, use `tag tag--hall`/`tag--opp` instead, no new CSS) + "Mietintö · {reportIdentifier}", decision paragraphs as `<p class="ph__intro">`, link "Avaa mietintö" → `reportUrl` with NAV htmx attrs.
- **EI block** (when `statementProposal`): chip EI +
  - vastalause: current content (label, statement text, source link)
  - moniste: current content (intro, PDF link)
  - muutosehdotus (new): label "{dissentLabel} · muutosehdotus" + short explainer ("Ehdotuksen sisältö on vastalauseessa") + link to mietintö.
- fi keys (`packages/server/src/locales/fi/votings.json` → `detail`): update `statement_proposal_kicker`; add `statement_mietinto_label` ("Mietintö"), `statement_open_report` ("Avaa mietintö"), `statement_amendment_label` ("muutosehdotus"), `statement_amendment_intro` ("Ehdotuksen sisältö on luettavissa mietinnön vastalauseesta.").

## Step 6 — Tests (TDD: write first, in voting-statement-proposal.test.ts)

1. `buildDecisionParagraphs`: strips both heading lines, splits paragraphs, null → `[]`.
2. Parser: `"58 §: mietintö JAA / Eemeli Peltosen ehdotus (vl 1) EI"` → muutosehdotus kind; lausumaehdotus/moniste forms unchanged (regression: `ehdotus` pattern must not swallow them).
3. `resolveDissentReference`: number match, `(vl)` single-dissent, proposer fallback, ambiguity → null.
4. `fetchStatementReportRows`: returns only the `%VM` row (TaVL row with same source_reference already seeded as the negative case).

## Step 7 — Verification

1. `bun run typecheck && bun test`
2. Render harness (NO server start): extend `packages/server/scripts/verify-statement-proposal.ts` to print `data.mietinto`; run for:
   - 56207, 56660 (lausumaehdotus: JAA decision paragraphs + EI text)
   - 56658, 56294 (moniste: JAA block + PDF link)
   - a muutosehdotus vote (e.g. one of the 141 — query id at runtime) → JAA block + labeled EI link
   - 56672 ("1. lakiehdotuksen hyväksyminen JAA, hylkääminen EI") → JAA block alone renders
   - an old voting with no mietintö match → section absent, page intact
3. Coverage measurement script (read-only): count votings rendering the JAA block (~2,833 expected).
4. Remind the user to restart the dev server.

## Key reuse / constraints

- `NAV` htmx attrs + section markup in `detail.page.tsx`; `findUnique` + `signerMatchesProposer` in `voting-title.ts`; `fetchStatementSignerRows` repository pattern.
- No pipeline/migration changes — `decision_text`, dissents and signers are already imported.
- Older votings stay without the section until older mietinnöt enter VaskiData (data-completeness issue, separate work).
