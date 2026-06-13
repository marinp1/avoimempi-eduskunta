/**
 * Final DB table → raw API source mapping (the traceability backbone).
 *
 * Every final table that surfaces in the webapp derives, row for row, from one
 * raw API table that the scraper fetched. This registry is the single source of
 * truth for that relationship and is consumed by:
 *   - the server's ProvenanceService, to resolve a displayed figure back to its
 *     source record (and build a per-record "open original" URL), and
 *   - the query-provenance auto-parser, to turn the tables a SQL query reads
 *     into the set of source datasets that back it.
 *
 * Ground truth is the migrator functions in
 * `packages/datapipe/migrator/fn/*.ts` — when a migrator changes which final
 * table it writes or how it derives a PK, update the matching entry here (the
 * query-provenance contract test fails when a queried table has no entry).
 *
 * Row-level trace is possible only when BOTH `sourcePkName` and `sourcePkColumn`
 * are set: `sourcePkName` must equal the raw-store pk name stored in the trace DB
 * (`ImportSourceReference.source_pk_name`), and the value of `sourcePkColumn` on
 * a final row must equal that source row's `source_pk_value`. Both invariants are
 * verified against the live databases for every row-level entry below:
 *   Voting.id == SaliDBAanestys.AanestysId, Vote.id == SaliDBAanestysEdustaja.EdustajaId,
 *   Representative.person_id == MemberOfParliament.personId, {Session,Section,Speech}.id == SaliDB*.Id,
 *   doc.vaski_document_id == VaskiData.Id.
 *
 * Lookup / fan-out / child tables (e.g. District, Committee, *Signer, *Stage)
 * carry only `sourceTable`: they still contribute to a query's source-dataset set
 * but expose no per-record URL.
 */
export interface SourceRule {
  /** Raw API table name — the key into the trace DB / TABLE_META. */
  sourceTable: string;
  /** Raw pk column name as stored in the trace DB. Omit for dataset-only tables. */
  sourcePkName?: string;
  /** Final-table column whose value equals the source row's pk. Omit for dataset-only tables. */
  sourcePkColumn?: string;
}

/** A VaskiData-derived document table: PK bridges to VaskiData via vaski_document_id. */
const vaskiDoc: SourceRule = {
  sourceTable: "VaskiData",
  sourcePkName: "Id",
  sourcePkColumn: "vaski_document_id",
};

/** A MemberOfParliament fan-out table keyed by person_id. */
const fromMop = (column = "person_id"): SourceRule => ({
  sourceTable: "MemberOfParliament",
  sourcePkName: "personId",
  sourcePkColumn: column,
});

export const SOURCE_LINEAGE: Record<string, SourceRule> = {
  // ── SaliDBAanestys → voting results ──
  Voting: {
    sourceTable: "SaliDBAanestys",
    sourcePkName: "AanestysId",
    sourcePkColumn: "id",
  },

  // ── SaliDBAanestysEdustaja → individual votes ──
  Vote: {
    sourceTable: "SaliDBAanestysEdustaja",
    sourcePkName: "EdustajaId",
    sourcePkColumn: "id",
  },
  // pre-aggregated vote tables (dataset-level only — derived during post-import)
  VotingPartyStats: { sourceTable: "SaliDBAanestysEdustaja" },
  PersonVotingDailyStats: { sourceTable: "SaliDBAanestysEdustaja" },
  PersonSpeechDailyStats: { sourceTable: "SaliDBPuheenvuoro" },

  // ── SaliDBIstunto → plenary sessions ──
  Session: {
    sourceTable: "SaliDBIstunto",
    sourcePkName: "Id",
    sourcePkColumn: "id",
  },
  Agenda: { sourceTable: "SaliDBIstunto" },

  // ── SaliDBKohta → agenda sections ──
  Section: {
    sourceTable: "SaliDBKohta",
    sourcePkName: "Id",
    sourcePkColumn: "id",
  },

  // ── SaliDBPuheenvuoro → speeches ──
  Speech: {
    sourceTable: "SaliDBPuheenvuoro",
    sourcePkName: "Id",
    sourcePkColumn: "id",
  },

  // ── SaliDBTiedote → session notices ──
  SessionNotice: {
    sourceTable: "SaliDBTiedote",
    sourcePkName: "Id",
    sourcePkColumn: "id",
  },

  // ── cross-reference helpers (dataset-level only) ──
  SaliDBDocumentReference: { sourceTable: "SaliDBKohtaAsiakirja" },
  SectionDocumentLink: { sourceTable: "SaliDBKohtaAsiakirja" },

  // ── MemberOfParliament → representatives and everything hanging off a person ──
  Representative: fromMop("person_id"),
  RepresentativeDistrict: fromMop(),
  Term: fromMop(),
  TemporaryAbsence: fromMop(),
  PeopleLeavingParliament: fromMop(),
  PeopleJoiningParliament: fromMop(),
  TrustPosition: fromMop(),
  CommitteeMembership: fromMop(),
  ParliamentaryGroupMembership: fromMop(),
  ParliamentaryGroupAssignment: fromMop(),
  GovernmentMembership: fromMop(),
  WorkHistory: fromMop(),
  Education: fromMop(),
  // deduped lookup tables derived from MemberOfParliament (dataset-level only)
  District: { sourceTable: "MemberOfParliament" },
  Committee: { sourceTable: "MemberOfParliament" },
  ParliamentaryGroup: { sourceTable: "MemberOfParliament" },
  Government: { sourceTable: "MemberOfParliament" },

  // ── VaskiData → documents (row-level via vaski_document_id) ──
  GovernmentProposal: vaskiDoc,
  Interpellation: vaskiDoc,
  WrittenQuestion: vaskiDoc,
  LegislativeInitiative: vaskiDoc,
  OralQuestion: vaskiDoc,
  CommitteeReport: vaskiDoc,
  ParliamentAnswer: vaskiDoc,
  // these two have no vaski_document_id; their own id is the VaskiData.Id
  ExpertStatement: {
    sourceTable: "VaskiData",
    sourcePkName: "Id",
    sourcePkColumn: "id",
  },
  WrittenQuestionResponse: {
    sourceTable: "VaskiData",
    sourcePkName: "Id",
    sourcePkColumn: "id",
  },
  VaskiDocument: {
    sourceTable: "VaskiData",
    sourcePkName: "Id",
    sourcePkColumn: "id",
  },
  // VaskiData child / detail tables (dataset-level only)
  GovernmentProposalSignatory: { sourceTable: "VaskiData" },
  GovernmentProposalSubject: { sourceTable: "VaskiData" },
  GovernmentProposalLaw: { sourceTable: "VaskiData" },
  GovernmentProposalStage: { sourceTable: "VaskiData" },
  InterpellationSigner: { sourceTable: "VaskiData" },
  InterpellationSubject: { sourceTable: "VaskiData" },
  InterpellationStage: { sourceTable: "VaskiData" },
  WrittenQuestionSigner: { sourceTable: "VaskiData" },
  WrittenQuestionSubject: { sourceTable: "VaskiData" },
  WrittenQuestionStage: { sourceTable: "VaskiData" },
  WrittenQuestionResponseSubject: { sourceTable: "VaskiData" },
  LegislativeInitiativeSigner: { sourceTable: "VaskiData" },
  LegislativeInitiativeSubject: { sourceTable: "VaskiData" },
  LegislativeInitiativeStage: { sourceTable: "VaskiData" },
  OralQuestionStage: { sourceTable: "VaskiData" },
  OralQuestionSubject: { sourceTable: "VaskiData" },
  CommitteeReportMember: { sourceTable: "VaskiData" },
  CommitteeReportExpert: { sourceTable: "VaskiData" },
  ParliamentAnswerSubject: { sourceTable: "VaskiData" },
  RollCallReport: { sourceTable: "VaskiData" },
  RollCallEntry: { sourceTable: "VaskiData" },
  SpeechContent: { sourceTable: "VaskiData" },
  SubSection: { sourceTable: "VaskiData" },
  SectionDocumentReference: { sourceTable: "VaskiData" },
};

/** Returns the source rule for a final table, or undefined when untracked. */
export function sourceRuleFor(finalTable: string): SourceRule | undefined {
  return SOURCE_LINEAGE[finalTable];
}
