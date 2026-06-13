import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  groupDissentRows,
  parseStatementProposalRef,
  parseVotePropositions,
  resolveDissentReference,
  resolveDissentStatement,
  resolveDissentStatementByProposer,
  surnameMatchesGenitive,
  type DissentForResolution,
} from "../src/features/voting/voting-title";
import { buildDecisionParagraphs } from "../src/features/voting/pages/detail.view-model";
import { VotingRepository } from "../src/features/voting/voting.repository";
import { createTestDb } from "./helpers/setup-db";

describe("parseStatementProposalRef", () => {
  const cases: Array<{
    title: string;
    expected: ReturnType<typeof parseStatementProposalRef>;
  }> = [
    {
      title: "Mietintö JAA / Johannes Yrttiahon lausumaehdotus 4 (vl 4) EI",
      expected: {
        kind: "vastalause",
        proposer: "Johannes Yrttiahon",
        statementNumber: 4,
        dissentNumber: 4,
      },
    },
    {
      title: "Mietintö JAA / Hanna Räsäsen lausumaehdotus (vl 2) EI",
      expected: {
        kind: "vastalause",
        proposer: "Hanna Räsäsen",
        statementNumber: null,
        dissentNumber: 2,
      },
    },
    {
      title: "Mietintö JAA / Krista Mikkosen lausumaehdotus 1 (vl) EI",
      expected: {
        kind: "vastalause",
        proposer: "Krista Mikkosen",
        statementNumber: 1,
        dissentNumber: null,
      },
    },
    {
      title: "Mietintö JAA / Lotta Hamarin lausumaehdotus (vl) EI",
      expected: {
        kind: "vastalause",
        proposer: "Lotta Hamarin",
        statementNumber: null,
        dissentNumber: null,
      },
    },
    {
      title: "Mietintö JAA / Ilmari Nurmisen monistelausumaehdotus 2 EI",
      expected: {
        kind: "moniste",
        proposer: "Ilmari Nurmisen",
        statementNumber: 2,
      },
    },
    {
      title: "Mietintö JAA / Ville Merisen lausumaehdotus (moniste) EI",
      expected: {
        kind: "moniste",
        proposer: "Ville Merisen",
        statementNumber: null,
      },
    },
    {
      title: "Mietintö JAA / Veronika Honkasalon lausumaehdotus 2 (moniste) EI",
      expected: {
        kind: "moniste",
        proposer: "Veronika Honkasalon",
        statementNumber: 2,
      },
    },
    {
      title: "Mietintö JAA / Atte Harjanteen lausumaehdotus 4 EI",
      expected: {
        kind: "plain",
        proposer: "Atte Harjanteen",
        statementNumber: 4,
      },
    },
  ];

  for (const { title, expected } of cases) {
    test(`parses "${title}"`, () => {
      expect(parseStatementProposalRef(title)).toEqual(expected);
    });
  }

  test("returns null for null title", () => {
    expect(parseStatementProposalRef(null)).toBeNull();
  });

  test("returns null for titles without a statement or amendment proposal", () => {
    expect(
      parseStatementProposalRef("Mietintö JAA / Antero Laukkasen ehdotus EI"),
    ).toBeNull();
    expect(parseStatementProposalRef("Äänestys 1")).toBeNull();
  });

  test("does not parse monistelausumaehdotus as vastalause", () => {
    const ref = parseStatementProposalRef(
      "Mietintö JAA / Tiina Elon monistelausumaehdotus 3 EI",
    );
    expect(ref?.kind).toBe("moniste");
  });

  test("parses muutosehdotus with dissent number", () => {
    expect(
      parseStatementProposalRef(
        "Mietintö JAA / Eemeli Peltosen ehdotus (vl 1) EI",
      ),
    ).toEqual({
      kind: "muutosehdotus",
      proposer: "Eemeli Peltosen",
      dissentNumber: 1,
    });
  });

  test("parses muutosehdotus without dissent number", () => {
    expect(
      parseStatementProposalRef(
        "Mietintö JAA / Eemeli Peltosen ehdotus (vl) EI",
      ),
    ).toEqual({
      kind: "muutosehdotus",
      proposer: "Eemeli Peltosen",
      dissentNumber: null,
    });
  });

  test("parses muutosehdotus with section prefix", () => {
    expect(
      parseStatementProposalRef(
        "58 §: mietintö JAA / Eemeli Peltosen ehdotus (vl 1) EI",
      ),
    ).toEqual({
      kind: "muutosehdotus",
      proposer: "Eemeli Peltosen",
      dissentNumber: 1,
    });
  });

  test("muutosehdotus pattern does not swallow lausumaehdotus", () => {
    const ref = parseStatementProposalRef(
      "Mietintö JAA / Johannes Yrttiahon lausumaehdotus 4 (vl 4) EI",
    );
    expect(ref?.kind).toBe("vastalause");
  });

  test("plain lausumaehdotus without a number still parses", () => {
    expect(
      parseStatementProposalRef(
        "Mietintö JAA / Matti Meikäläisen lausumaehdotus EI",
      ),
    ).toEqual({
      kind: "plain",
      proposer: "Matti Meikäläisen",
      statementNumber: null,
    });
  });
});

describe("surnameMatchesGenitive", () => {
  const matches: Array<[string, string]> = [
    ["Yrttiaho", "Yrttiahon"],
    ["Elo", "Elon"],
    ["Mäkynen", "Mäkysen"],
    ["Pekonen", "Pekosen"],
    ["Harjanne", "Harjanteen"],
    ["Berg", "Bergin"],
    ["Honkasalo", "Honkasalon"],
  ];
  for (const [nominative, genitive] of matches) {
    test(`${nominative} matches ${genitive}`, () => {
      expect(surnameMatchesGenitive(nominative, genitive)).toBe(true);
    });
  }

  test("does not match unrelated surnames", () => {
    expect(surnameMatchesGenitive("Virtanen", "Mäkysen")).toBe(false);
    expect(surnameMatchesGenitive("Elo", "Eskolan")).toBe(false);
  });
});

describe("parseVotePropositions", () => {
  test("splits title on JAA / EI markers", () => {
    expect(
      parseVotePropositions(
        "Mietintö JAA / Johannes Yrttiahon lausumaehdotus 4 (vl 4) EI",
      ),
    ).toEqual({
      yes: "Mietintö",
      no: "Johannes Yrttiahon lausumaehdotus 4 (vl 4)",
    });
  });

  test("returns null when markers are missing", () => {
    expect(parseVotePropositions("Äänestys 1")).toBeNull();
    expect(
      parseVotePropositions("Kannanotto, mietintö / Pia Viitanen (VL 1)"),
    ).toBeNull();
    expect(parseVotePropositions(null)).toBeNull();
  });
});

function makeDissent(
  overrides: Partial<DissentForResolution> = {},
): DissentForResolution {
  return {
    dissentOrder: 1,
    dissentNumber: 1,
    heading: "Vastalause 1",
    statements: [
      {
        statementOrder: 1,
        statementNumber: 1,
        statementText: "1. Eduskunta edellyttää, että asia A hoidetaan.",
      },
      {
        statementOrder: 2,
        statementNumber: 2,
        statementText: "2. Eduskunta edellyttää, että asia B hoidetaan.",
      },
    ],
    ...overrides,
  };
}

describe("resolveDissentStatement", () => {
  const ref = (statementNumber: number | null, dissentNumber: number | null) =>
    ({
      kind: "vastalause",
      proposer: "Testi Testaajan",
      statementNumber,
      dissentNumber,
    }) as const;

  test("matches dissent and statement by number", () => {
    const dissents = [
      makeDissent(),
      makeDissent({
        dissentOrder: 2,
        dissentNumber: 4,
        heading: "Vastalause 4",
        statements: [
          {
            statementOrder: 1,
            statementNumber: 4,
            statementText: "4. Eduskunta edellyttää, että asia C hoidetaan.",
          },
        ],
      }),
    ];
    expect(resolveDissentStatement(ref(4, 4), dissents)).toEqual({
      statementText: "4. Eduskunta edellyttää, että asia C hoidetaan.",
      statementNumber: 4,
      dissentNumber: 4,
      dissentHeading: "Vastalause 4",
    });
  });

  test("falls back to dissent order when no dissent number matches", () => {
    const dissents = [
      makeDissent({ dissentNumber: null, heading: "VASTALAUSE" }),
    ];
    const resolved = resolveDissentStatement(ref(2, 1), dissents);
    expect(resolved?.statementText).toContain("asia B");
  });

  test("(vl) without number requires exactly one dissent", () => {
    const single = [makeDissent()];
    expect(
      resolveDissentStatement(ref(1, null), single)?.statementText,
    ).toContain("asia A");

    const multiple = [
      makeDissent(),
      makeDissent({ dissentOrder: 2, dissentNumber: 2 }),
    ];
    expect(resolveDissentStatement(ref(1, null), multiple)).toBeNull();
  });

  test("(vl) with multiple dissents resolves when only one has statements", () => {
    const dissents = [
      makeDissent({ statements: [] }),
      makeDissent({
        dissentOrder: 2,
        dissentNumber: 2,
        heading: "Vastalause 2",
        statements: [
          {
            statementOrder: 1,
            statementNumber: 2,
            statementText: "2. Eduskunta edellyttää, että asia E hoidetaan.",
          },
        ],
      }),
    ];
    expect(
      resolveDissentStatement(ref(2, null), dissents)?.statementText,
    ).toContain("asia E");
  });

  test("missing statement number requires exactly one statement", () => {
    const oneStatement = [
      makeDissent({
        statements: [
          {
            statementOrder: 1,
            statementNumber: null,
            statementText: "Eduskunta edellyttää, että asia D hoidetaan.",
          },
        ],
      }),
    ];
    expect(
      resolveDissentStatement(ref(null, 1), oneStatement)?.statementText,
    ).toContain("asia D");

    expect(resolveDissentStatement(ref(null, 1), [makeDissent()])).toBeNull();
  });

  test("falls back to statement order when no statement number matches", () => {
    const dissents = [
      makeDissent({
        statements: [
          {
            statementOrder: 1,
            statementNumber: null,
            statementText: "Ensimmäinen lausuma.",
          },
          {
            statementOrder: 2,
            statementNumber: null,
            statementText: "Toinen lausuma.",
          },
        ],
      }),
    ];
    expect(resolveDissentStatement(ref(2, 1), dissents)?.statementText).toBe(
      "Toinen lausuma.",
    );
  });

  test("returns null when dissent is not found", () => {
    expect(resolveDissentStatement(ref(1, 7), [makeDissent()])).toBeNull();
  });

  test("returns null for empty dissent list", () => {
    expect(resolveDissentStatement(ref(1, 1), [])).toBeNull();
  });
});

describe("resolveDissentStatementByProposer", () => {
  const harjanneDissent = makeDissent({
    dissentNumber: null,
    heading: "Vastalause",
    statements: [
      {
        statementOrder: 1,
        statementNumber: 1,
        statementText: "1. Eduskunta edellyttää työryhmän asettamista.",
      },
      {
        statementOrder: 2,
        statementNumber: 4,
        statementText: "4. Eduskunta edellyttää raaka-aineiden saatavuutta.",
      },
    ],
    signers: [
      { firstName: "Atte", lastName: "Harjanne" },
      { firstName: "Jessi", lastName: "Jokelainen" },
    ],
  });

  test("resolves via proposer signer match", () => {
    const resolved = resolveDissentStatementByProposer(
      { kind: "plain", proposer: "Atte Harjanteen", statementNumber: 4 },
      [harjanneDissent],
    );
    expect(resolved?.statementText).toContain("raaka-aineiden");
  });

  test("matches proposer across multiple dissents", () => {
    const other = makeDissent({
      dissentOrder: 2,
      dissentNumber: 2,
      signers: [{ firstName: "Matias", lastName: "Mäkynen" }],
      statements: [
        {
          statementOrder: 1,
          statementNumber: 1,
          statementText: "1. Toisen vastalauseen lausuma.",
        },
      ],
    });
    const resolved = resolveDissentStatementByProposer(
      { kind: "plain", proposer: "Matias Mäkysen", statementNumber: 1 },
      [harjanneDissent, other],
    );
    expect(resolved?.statementText).toContain("Toisen vastalauseen");
  });

  test("returns null when no signer matches the proposer", () => {
    expect(
      resolveDissentStatementByProposer(
        { kind: "plain", proposer: "Matias Mäkysen", statementNumber: 1 },
        [harjanneDissent],
      ),
    ).toBeNull();
  });

  test("returns null when the matched dissent lacks the statement", () => {
    const noStatements = makeDissent({
      statements: [],
      signers: [{ firstName: "Matias", lastName: "Mäkynen" }],
    });
    expect(
      resolveDissentStatementByProposer(
        { kind: "plain", proposer: "Matias Mäkysen", statementNumber: 1 },
        [noStatements],
      ),
    ).toBeNull();
  });

  test("returns null when proposer matches signers in multiple dissents", () => {
    const a = makeDissent({
      signers: [{ firstName: "Matias", lastName: "Mäkynen" }],
    });
    const b = makeDissent({
      dissentOrder: 2,
      dissentNumber: 2,
      signers: [{ firstName: "Matias", lastName: "Mäkynen" }],
    });
    expect(
      resolveDissentStatementByProposer(
        { kind: "plain", proposer: "Matias Mäkysen", statementNumber: 1 },
        [a, b],
      ),
    ).toBeNull();
  });
});

describe("resolveDissentReference", () => {
  const ref = (dissentNumber: number | null) =>
    ({
      kind: "muutosehdotus",
      proposer: "Testi Testaajan",
      dissentNumber,
    }) as const;

  test("matches dissent by dissent number", () => {
    const dissents = [
      makeDissent(),
      makeDissent({
        dissentOrder: 2,
        dissentNumber: 4,
        heading: "Vastalause 4",
        statements: [],
      }),
    ];
    expect(resolveDissentReference(ref(4), dissents)).toEqual({
      dissentNumber: 4,
      dissentHeading: "Vastalause 4",
    });
  });

  test("falls back to dissent order when no dissent number matches", () => {
    const dissents = [
      makeDissent({ dissentNumber: null, heading: "VASTALAUSE" }),
    ];
    expect(resolveDissentReference(ref(1), dissents)).toEqual({
      dissentNumber: null,
      dissentHeading: "VASTALAUSE",
    });
  });

  test("(vl) without number resolves to single dissent", () => {
    const single = [makeDissent({ statements: [] })];
    expect(resolveDissentReference(ref(null), single)).toEqual({
      dissentNumber: 1,
      dissentHeading: "Vastalause 1",
    });

    const multiple = [
      makeDissent(),
      makeDissent({ dissentOrder: 2, dissentNumber: 2 }),
    ];
    expect(resolveDissentReference(ref(null), multiple)).toBeNull();
  });

  test("resolves via proposer signer match", () => {
    const harjanneDissent = makeDissent({
      dissentNumber: null,
      heading: "Vastalause",
      statements: [],
      signers: [
        { firstName: "Atte", lastName: "Harjanne" },
        { firstName: "Jessi", lastName: "Jokelainen" },
      ],
    });
    expect(
      resolveDissentReference(
        {
          kind: "muutosehdotus",
          proposer: "Atte Harjanteen",
          dissentNumber: null,
        },
        [harjanneDissent],
      ),
    ).toEqual({
      dissentNumber: null,
      dissentHeading: "Vastalause",
    });
  });

  test("returns null when proposer matches multiple dissents", () => {
    const a = makeDissent({
      signers: [{ firstName: "Matias", lastName: "Mäkynen" }],
    });
    const b = makeDissent({
      dissentOrder: 2,
      dissentNumber: 2,
      signers: [{ firstName: "Matias", lastName: "Mäkynen" }],
    });
    expect(
      resolveDissentReference(
        {
          kind: "muutosehdotus",
          proposer: "Matias Mäkysen",
          dissentNumber: null,
        },
        [a, b],
      ),
    ).toBeNull();
  });

  test("returns null when dissent not found", () => {
    expect(resolveDissentReference(ref(7), [makeDissent()])).toBeNull();
    expect(resolveDissentReference(ref(1), [])).toBeNull();
  });
});

describe("groupDissentRows", () => {
  test("merges signer rows into dissents", () => {
    const grouped = groupDissentRows(
      [
        {
          report_id: 500,
          parliament_identifier: "LaVM 18/2025 vp",
          dissent_order: 1,
          dissent_number: null,
          heading: "Vastalause",
          statement_order: 1,
          statement_number: 1,
          statement_text: "1. Lausuma.",
        },
      ],
      [
        {
          report_id: 500,
          dissent_order: 1,
          signer_order: 1,
          first_name: "Atte",
          last_name: "Harjanne",
        },
        {
          report_id: 500,
          dissent_order: 1,
          signer_order: 2,
          first_name: "Jessi",
          last_name: "Jokelainen",
        },
      ],
    );
    expect(grouped?.dissents[0]?.signers).toEqual([
      { firstName: "Atte", lastName: "Harjanne" },
      { firstName: "Jessi", lastName: "Jokelainen" },
    ]);
  });

  test("groups flat SQL rows into dissents with statements", () => {
    const grouped = groupDissentRows([
      {
        report_id: 500,
        parliament_identifier: "TaVM 16/2026 vp",
        dissent_order: 1,
        dissent_number: 1,
        heading: "Vastalause 1",
        statement_order: 1,
        statement_number: 1,
        statement_text: "1. Lausuma yksi.",
      },
      {
        report_id: 500,
        parliament_identifier: "TaVM 16/2026 vp",
        dissent_order: 1,
        dissent_number: 1,
        heading: "Vastalause 1",
        statement_order: 2,
        statement_number: 2,
        statement_text: "2. Lausuma kaksi.",
      },
      {
        report_id: 500,
        parliament_identifier: "TaVM 16/2026 vp",
        dissent_order: 2,
        dissent_number: 2,
        heading: "Vastalause 2",
        statement_order: null,
        statement_number: null,
        statement_text: null,
      },
    ]);

    expect(grouped?.reportId).toBe(500);
    expect(grouped?.reportIdentifier).toBe("TaVM 16/2026 vp");
    expect(grouped?.dissents).toHaveLength(2);
    expect(grouped?.dissents[0]?.statements).toHaveLength(2);
    expect(grouped?.dissents[1]?.statements).toHaveLength(0);
  });

  test("returns null for empty rows", () => {
    expect(groupDissentRows([])).toBeNull();
  });

  test("returns null when rows span multiple reports", () => {
    const row = {
      report_id: 500,
      parliament_identifier: "TaVM 16/2026 vp",
      dissent_order: 1,
      dissent_number: 1,
      heading: "Vastalause 1",
      statement_order: 1,
      statement_number: 1,
      statement_text: "1. Lausuma.",
    };
    expect(
      groupDissentRows([
        row,
        { ...row, report_id: 501, parliament_identifier: "TaVM 17/2026 vp" },
      ]),
    ).toBeNull();
  });
});

describe("buildDecisionParagraphs", () => {
  test("splits text on blank lines and strips headings", () => {
    const text =
      "VALIOKUNNAN PÄÄTÖSEHDOTUS\nSosiaali- ja terveysvaliokunnan päätösehdotus:\n\nEduskunta hyväksyy lakiehdotuksen.\n\nEduskunta edellyttää, että hallitus seuraa tilannetta.";
    expect(buildDecisionParagraphs(text)).toEqual([
      "Eduskunta hyväksyy lakiehdotuksen.",
      "Eduskunta edellyttää, että hallitus seuraa tilannetta.",
    ]);
  });

  test("returns empty array for null", () => {
    expect(buildDecisionParagraphs(null)).toEqual([]);
  });

  test("returns empty array for heading-only text", () => {
    expect(
      buildDecisionParagraphs(
        "VALIOKUNNAN PÄÄTÖSEHDOTUS\nSosiaali- ja terveysvaliokunnan päätösehdotus:",
      ),
    ).toEqual([]);
  });
});

describe("VotingRepository statement proposal queries", () => {
  let db: Database;
  let repo: VotingRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new VotingRepository(db);

    db.run(
      `INSERT INTO CommitteeReport (id, parliament_identifier, report_type_code, document_number, parliamentary_year, source_reference, source_path, decision_text)
       VALUES (500, 'TaVM 16/2026 vp', 'TaVM', 16, '2026', 'HE 2/2026 vp', 'test', 'VALIOKUNNAN PÄÄTÖSEHDOTUS\nTalousvaliokunnan päätösehdotus:\n\nEduskunta hyväksyy lakiehdotuksen.')`,
    );
    db.run(
      `INSERT INTO CommitteeReportDissent (report_id, dissent_order, dissent_number, heading, signature_date)
       VALUES (500, 1, 4, 'Vastalause 4', '2026-06-05')`,
    );
    db.run(
      `INSERT INTO CommitteeReportDissentStatement (report_id, dissent_order, statement_order, statement_number, statement_text)
       VALUES (500, 1, 1, 4, '4. Eduskunta edellyttää, että hankintalakia muutetaan.')`,
    );
    db.run(
      `INSERT INTO CommitteeReport (id, parliament_identifier, report_type_code, document_number, parliamentary_year, source_reference, source_path)
       VALUES (501, 'TaVL 3/2026 vp', 'TaVL', 3, '2026', 'HE 2/2026 vp', 'test')`,
    );
    db.run(
      `INSERT INTO CommitteeReportDissent (report_id, dissent_order, dissent_number, heading, signature_date)
       VALUES (501, 1, 1, 'Eriävä mielipide', NULL)`,
    );
    db.run(
      `INSERT INTO PlenaryAnnex (id, edk_identifier, title, source_reference, session_key, meeting_date, draft_date, source_path)
       VALUES (950, 'EDK-2026-AK-35124', 'Lausumaehdotukset 9.6.2026', 'HE 2/2026 vp', '2026/63', '2026-06-10', '2026-06-10', 'test')`,
    );
    db.run(
      `INSERT INTO PlenaryAnnex (id, edk_identifier, title, source_reference, session_key, meeting_date, draft_date, source_path)
       VALUES (951, 'EDK-2026-AK-35000', 'Pöytäkirjan liite', 'HE 2/2026 vp', '2026/63', '2026-06-10', '2026-06-10', 'test')`,
    );
    db.run(
      `INSERT INTO CommitteeReportDissentSigner (report_id, dissent_order, signer_order, person_id, first_name, last_name, party)
       VALUES (500, 1, 1, NULL, 'Johannes', 'Yrttiaho', 'vas')`,
    );
    db.run(
      `INSERT INTO CommitteeReportDissentSigner (report_id, dissent_order, signer_order, person_id, first_name, last_name, party)
       VALUES (501, 1, 1, NULL, 'Lausunto', 'Allekirjoittaja', NULL)`,
    );
  });

  afterEach(() => {
    db.close();
  });

  test("fetchStatementProposalRows returns only mietintö dissents for the source reference", () => {
    const rows = repo.fetchStatementProposalRows({
      sourceReference: "HE 2/2026 vp",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.report_id).toBe(500);
    expect(rows[0]?.statement_text).toContain("hankintalakia");
  });

  test("fetchStatementProposalRows returns empty for unknown reference", () => {
    expect(
      repo.fetchStatementProposalRows({ sourceReference: "HE 999/2026 vp" }),
    ).toHaveLength(0);
  });

  test("fetchStatementSignerRows returns only mietintö signers", () => {
    const rows = repo.fetchStatementSignerRows({
      sourceReference: "HE 2/2026 vp",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      report_id: 500,
      dissent_order: 1,
      signer_order: 1,
      first_name: "Johannes",
      last_name: "Yrttiaho",
    });
  });

  test("fetchStatementAnnex returns the lausumaehdotus annex for the session", () => {
    const annex = repo.fetchStatementAnnex({
      sourceReference: "HE 2/2026 vp",
      sessionKey: "2026/63",
    });
    expect(annex?.edk_identifier).toBe("EDK-2026-AK-35124");
    expect(annex?.title).toBe("Lausumaehdotukset 9.6.2026");
  });

  test("fetchStatementAnnex returns null when session does not match", () => {
    expect(
      repo.fetchStatementAnnex({
        sourceReference: "HE 2/2026 vp",
        sessionKey: "2026/64",
      }),
    ).toBeNull();
  });

  test("fetchStatementReportRows returns the mietintö for the source reference", () => {
    const rows = repo.fetchStatementReportRows({
      sourceReference: "HE 2/2026 vp",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(500);
    expect(rows[0]?.parliament_identifier).toBe("TaVM 16/2026 vp");
    expect(rows[0]?.decision_text).toContain("Eduskunta hyväksyy");
  });

  test("fetchStatementReportRows returns empty for unknown reference", () => {
    expect(
      repo.fetchStatementReportRows({ sourceReference: "HE 999/2026 vp" }),
    ).toHaveLength(0);
  });
});
