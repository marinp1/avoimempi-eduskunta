import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VaskiEntry } from "../migrator/fn/VaskiData/reader";
import createSubMigrator from "../migrator/fn/VaskiData/submigrators/valiokunnan_mietintö";
import { extractSourceReference } from "../migrator/fn/VaskiData/submigrators/helpers/source-reference";
import { clearStatementCache } from "../migrator/utils";
import { createTestDb } from "./helpers/setup-db";

function makeMietintoRow(
  mietintoOverrides: Record<string, unknown> = {},
  rowOverrides: Partial<VaskiEntry> = {},
): VaskiEntry {
  return {
    id: "342429",
    eduskuntaTunnus: "TaVM 16/2026 vp",
    status: "5",
    created: "2026-05-27 12:00:00",
    attachmentGroupId: "1",
    _source: {
      page: 1,
      parsedKey: "parsed/VaskiData/pk_342429",
      vaskiPath: "vaski-data/valiokunnan_mietintö/342429",
    },
    contents: {
      Siirto: {
        SiirtoMetatieto: {
          JulkaisuMetatieto: {
            "@_laadintaPvm": "2026-05-27",
          },
        },
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            Mietinto: {
              IdentifiointiOsa: {
                Nimeke: {
                  NimekeTeksti: "Hallituksen esitys eduskunnalle laiksi",
                },
                OrganisaatioTeksti: "Talousvaliokunta",
              },
              AsiaKuvaus: {
                VireilletuloAsia: {
                  KappaleKooste: {
                    AsiakirjaViiteTunnus: "HE 2/2026 vp",
                    "#text": "Hallituksen esitys eduskunnalle laiksi",
                  },
                },
              },
              PaatosOsa: { KappaleKooste: "Päätösteksti" },
              ...mietintoOverrides,
            },
          },
        },
      },
    },
    ...rowOverrides,
  };
}

function makeDissent(overrides: Record<string, unknown> = {}) {
  return {
    OtsikkoTeksti: "Vastalause 4",
    PerusteluOsa: {
      OtsikkoTeksti: "Perustelut",
      PerusteluLuku: { KappaleKooste: "Perustelut tähän" },
    },
    SuppeaLausumaKannanottoOsa: {
      LihavaKursiiviOtsikkoTeksti: "Vastalauseen lausumaehdotukset",
      SisennettyKappaleKooste: [
        { KursiiviTeksti: "1. Eduskunta edellyttää ensimmäistä asiaa." },
        { KursiiviTeksti: "2. Eduskunta edellyttää toista asiaa." },
      ],
    },
    SuppeaAllekirjoitusOsa: {
      SuppeaPaivays: {
        AjankohtaTeksti: "Helsingissä 27.5.2026",
        "@_allekirjoitusPvm": "2026-05-27",
      },
      Allekirjoittaja: {
        Henkilo: {
          EtuNimi: "Johannes",
          SukuNimi: "Yrttiaho",
          LisatietoTeksti: "vas",
          "@_muuTunnus": "1407",
        },
      },
    },
    ...overrides,
  };
}

describe("extractSourceReference", () => {
  test("reads legacy EduskuntaTunnus paths", () => {
    expect(extractSourceReference({ EduskuntaTunnus: "HE 1/2020 vp" })).toBe(
      "HE 1/2020 vp",
    );
    expect(
      extractSourceReference({ EduskuntaTunnusTeksti: "HE 2/2020 vp" }),
    ).toBe("HE 2/2020 vp");
  });

  test("reads AsiakirjaViiteTunnus from object KappaleKooste", () => {
    expect(
      extractSourceReference({
        KappaleKooste: {
          AsiakirjaViiteTunnus: "HE 2/2026 vp",
          "#text": "Hallituksen esitys",
        },
      }),
    ).toBe("HE 2/2026 vp");
  });

  test("reads AsiakirjaViiteTunnus from array KappaleKooste", () => {
    expect(
      extractSourceReference({
        KappaleKooste: [
          { "#text": "Ingressi ilman viitettä" },
          { AsiakirjaViiteTunnus: "LA 14/2024 vp" },
        ],
      }),
    ).toBe("LA 14/2024 vp");
  });

  test("takes first identifier when AsiakirjaViiteTunnus is an array", () => {
    expect(
      extractSourceReference({
        KappaleKooste: {
          AsiakirjaViiteTunnus: ["HE 5/2019 vp", "HE 6/2019 vp"],
        },
      }),
    ).toBe("HE 5/2019 vp");
  });

  test("falls back to regex over bare string KappaleKooste", () => {
    expect(
      extractSourceReference({
        KappaleKooste:
          "Hallituksen esitys HE 30/2018 vp on saapunut valiokuntaan.",
      }),
    ).toBe("HE 30/2018 vp");
  });

  test("returns null when nothing matches", () => {
    expect(extractSourceReference(undefined)).toBeNull();
    expect(extractSourceReference({})).toBeNull();
    expect(
      extractSourceReference({ KappaleKooste: "Ei tunnusta tässä." }),
    ).toBeNull();
  });
});

describe("Vaski valiokunnan_mietintö submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => Promise<void>;
  let reportLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    reportLogDir = mkdtempSync(join(tmpdir(), "mietinto-report-"));
    process.env.MIGRATOR_REPORT_LOG_DIR = reportLogDir;
    db = createTestDb(45);
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_REPORT_LOG_DIR;
    rmSync(reportLogDir, { recursive: true, force: true });
  });

  test("stores source_reference from VireilletuloAsia KappaleKooste", async () => {
    await migrateRow(makeMietintoRow());

    const report = db
      .query(
        "SELECT id, source_reference FROM CommitteeReport WHERE parliament_identifier = 'TaVM 16/2026 vp'",
      )
      .get() as any;
    expect(report.source_reference).toBe("HE 2/2026 vp");
  });

  test("imports dissents with statements and signers from JasenMielipideOsa array", async () => {
    await migrateRow(
      makeMietintoRow({
        JasenMielipideOsa: [
          makeDissent({ OtsikkoTeksti: "Vastalause 1" }),
          makeDissent({
            OtsikkoTeksti: "VASTALAUSE 2 /sd",
            SuppeaAllekirjoitusOsa: {
              SuppeaPaivays: { "@_allekirjoitusPvm": "2026-05-26" },
              Allekirjoittaja: [
                {
                  Henkilo: {
                    EtuNimi: "Lauri",
                    SukuNimi: "Lyly",
                    LisatietoTeksti: "sd",
                    "@_muuTunnus": "1138",
                  },
                },
                {
                  Henkilo: {
                    EtuNimi: "Matias",
                    SukuNimi: "Mäkynen",
                    LisatietoTeksti: "sd",
                    "@_muuTunnus": "1432",
                  },
                },
              ],
            },
          }),
          makeDissent({
            OtsikkoTeksti: "VASTALAUSE",
            SuppeaLausumaKannanottoOsa: {
              SisennettyKappaleKooste: {
                KursiiviTeksti:
                  "Eduskunta edellyttää yhtä asiaa ilman numeroa.",
              },
            },
          }),
        ],
      }),
    );

    const dissents = db
      .query(
        "SELECT dissent_order, dissent_number, heading, signature_date FROM CommitteeReportDissent WHERE report_id = 342429 ORDER BY dissent_order",
      )
      .all() as any[];
    expect(dissents).toHaveLength(3);
    expect(dissents[0]).toMatchObject({
      dissent_order: 1,
      dissent_number: 1,
      heading: "Vastalause 1",
      signature_date: "2026-05-27",
    });
    expect(dissents[1]).toMatchObject({
      dissent_order: 2,
      dissent_number: 2,
      heading: "VASTALAUSE 2 /sd",
      signature_date: "2026-05-26",
    });
    expect(dissents[2]).toMatchObject({
      dissent_order: 3,
      dissent_number: null,
      heading: "VASTALAUSE",
    });

    const statements = db
      .query(
        "SELECT dissent_order, statement_order, statement_number, statement_text FROM CommitteeReportDissentStatement WHERE report_id = 342429 ORDER BY dissent_order, statement_order",
      )
      .all() as any[];
    expect(statements).toHaveLength(5);
    expect(statements[0]).toMatchObject({
      dissent_order: 1,
      statement_order: 1,
      statement_number: 1,
      statement_text: "1. Eduskunta edellyttää ensimmäistä asiaa.",
    });
    expect(statements[1]).toMatchObject({
      statement_order: 2,
      statement_number: 2,
    });
    expect(statements[4]).toMatchObject({
      dissent_order: 3,
      statement_order: 1,
      statement_number: null,
      statement_text: "Eduskunta edellyttää yhtä asiaa ilman numeroa.",
    });

    const signers = db
      .query(
        "SELECT dissent_order, signer_order, person_id, first_name, last_name, party FROM CommitteeReportDissentSigner WHERE report_id = 342429 ORDER BY dissent_order, signer_order",
      )
      .all() as any[];
    expect(signers).toHaveLength(4);
    expect(signers[0]).toMatchObject({
      dissent_order: 1,
      signer_order: 1,
      person_id: 1407,
      first_name: "Johannes",
      last_name: "Yrttiaho",
      party: "vas",
    });
    expect(signers[1]).toMatchObject({
      dissent_order: 2,
      person_id: 1138,
      last_name: "Lyly",
    });
    expect(signers[2]).toMatchObject({
      dissent_order: 2,
      signer_order: 2,
      person_id: 1432,
      last_name: "Mäkynen",
    });
  });

  test("handles single-object JasenMielipideOsa and bare-string statement items", async () => {
    await migrateRow(
      makeMietintoRow({
        JasenMielipideOsa: makeDissent({
          SuppeaLausumaKannanottoOsa: {
            SisennettyKappaleKooste: [
              "1) Eduskunta edellyttää sulkunumeroitua asiaa.",
              { LihavaTeksti: "2. Eduskunta edellyttää lihavoitua asiaa." },
            ],
          },
        }),
      }),
    );

    const statements = db
      .query(
        "SELECT statement_order, statement_number, statement_text FROM CommitteeReportDissentStatement WHERE report_id = 342429 ORDER BY statement_order",
      )
      .all() as any[];
    expect(statements).toHaveLength(2);
    expect(statements[0]).toMatchObject({
      statement_number: 1,
      statement_text: "1) Eduskunta edellyttää sulkunumeroitua asiaa.",
    });
    expect(statements[1]).toMatchObject({
      statement_number: 2,
      statement_text: "2. Eduskunta edellyttää lihavoitua asiaa.",
    });
  });

  test("falls back to PonsiOsa lausumas when SuppeaLausumaKannanottoOsa is missing", async () => {
    await migrateRow(
      makeMietintoRow({
        JasenMielipideOsa: makeDissent({
          OtsikkoTeksti: "Vastalause 3",
          SuppeaLausumaKannanottoOsa: undefined,
          PonsiOsa: {
            JohdantoTeksti: "Edellä olevan perusteella ehdotamme,",
            SisennettyKappaleKooste: [
              {
                KursiiviTeksti: "että hyväksytään kaksi lausumaa.",
                LihavaKursiiviTeksti: "(Vastalauseen lausumaehdotukset)",
              },
              {
                KursiiviTeksti:
                  "1. Eduskunta edellyttää, että valtioneuvosto seuraa vaikutuksia.",
              },
              {
                KursiiviTeksti:
                  "2. Eduskunta edellyttää, että valtioneuvosto ryhtyy toimiin.",
              },
            ],
          },
        }),
      }),
    );

    const statements = db
      .query(
        "SELECT statement_order, statement_number, statement_text FROM CommitteeReportDissentStatement WHERE report_id = 342429 ORDER BY statement_order",
      )
      .all() as any[];
    expect(statements).toHaveLength(2);
    expect(statements[0]).toMatchObject({
      statement_order: 1,
      statement_number: 1,
    });
    expect(statements[0].statement_text).toContain("seuraa vaikutuksia");
    expect(statements[1]).toMatchObject({
      statement_order: 2,
      statement_number: 2,
    });
  });

  test("PonsiOsa fallback reads unnumbered lausuma from KappaleKooste", async () => {
    await migrateRow(
      makeMietintoRow({
        JasenMielipideOsa: makeDissent({
          OtsikkoTeksti: "Vastalause",
          SuppeaLausumaKannanottoOsa: undefined,
          PonsiOsa: {
            JohdantoTeksti: "Edellä olevan perusteella ehdotamme,",
            SisennettyKappaleKooste: {
              KursiiviTeksti: "että hyväksytään yksi lausuma.",
              LihavaKursiiviTeksti: "(Vastalauseen lausumaehdotus)",
            },
            KappaleKooste: [
              { LihavaKursiiviTeksti: "Vastalauseen lausumaehdotus" },
              {
                KursiiviTeksti:
                  "Eduskunta edellyttää, että valtioneuvosto käynnistää selvitystyön.",
              },
            ],
          },
        }),
      }),
    );

    const statements = db
      .query(
        "SELECT statement_number, statement_text FROM CommitteeReportDissentStatement WHERE report_id = 342429",
      )
      .all() as any[];
    expect(statements).toHaveLength(1);
    expect(statements[0].statement_number).toBeNull();
    expect(statements[0].statement_text).toContain("käynnistää selvitystyön");
  });

  test("PonsiOsa fallback ignores ponsi without lausuma marker (muutosehdotukset)", async () => {
    await migrateRow(
      makeMietintoRow({
        JasenMielipideOsa: makeDissent({
          OtsikkoTeksti: "Vastalause 1",
          SuppeaLausumaKannanottoOsa: undefined,
          PonsiOsa: {
            JohdantoTeksti: "Edellä olevan perusteella ehdotamme,",
            SisennettyKappaleKooste: [
              {
                KursiiviTeksti:
                  "että 2.—6. lakiehdotus hyväksytään mietinnön mukaisena, ja",
              },
              {
                KursiiviTeksti: "että 1. lakiehdotus hyväksytään muutettuna.",
                LihavaKursiiviTeksti: "(Vastalauseen muutosehdotukset)",
              },
            ],
          },
        }),
      }),
    );

    const statements = db
      .query(
        "SELECT statement_order FROM CommitteeReportDissentStatement WHERE report_id = 342429",
      )
      .all() as any[];
    expect(statements).toHaveLength(0);
  });

  test("PonsiOsa is ignored when SuppeaLausumaKannanottoOsa has statements", async () => {
    await migrateRow(
      makeMietintoRow({
        JasenMielipideOsa: makeDissent({
          PonsiOsa: {
            JohdantoTeksti: "Edellä olevan perusteella ehdotamme,",
            SisennettyKappaleKooste: {
              KursiiviTeksti: "että hyväksytään kaksi lausumaa.",
            },
          },
        }),
      }),
    );

    const statements = db
      .query(
        "SELECT statement_text FROM CommitteeReportDissentStatement WHERE report_id = 342429 ORDER BY statement_order",
      )
      .all() as any[];
    expect(statements).toHaveLength(2);
    expect(statements[0].statement_text).toBe(
      "1. Eduskunta edellyttää ensimmäistä asiaa.",
    );
  });

  test("imports dissent without statements (muutosehdotus-only vastalause)", async () => {
    await migrateRow(
      makeMietintoRow({
        JasenMielipideOsa: makeDissent({
          SuppeaLausumaKannanottoOsa: undefined,
        }),
      }),
    );

    const dissents = db
      .query(
        "SELECT dissent_order FROM CommitteeReportDissent WHERE report_id = 342429",
      )
      .all() as any[];
    expect(dissents).toHaveLength(1);

    const statements = db
      .query(
        "SELECT statement_order FROM CommitteeReportDissentStatement WHERE report_id = 342429",
      )
      .all() as any[];
    expect(statements).toHaveLength(0);
  });

  test("keeps dissents when a revision of the same report has none", async () => {
    await migrateRow(makeMietintoRow({ JasenMielipideOsa: [makeDissent()] }));
    await migrateRow(
      makeMietintoRow(
        { JasenMielipideOsa: undefined },
        { id: "342500", created: "2026-06-01 09:00:00" },
      ),
    );

    const dissents = db
      .query(
        "SELECT dissent_order FROM CommitteeReportDissent WHERE report_id = 342429",
      )
      .all() as any[];
    expect(dissents).toHaveLength(1);

    const reports = db
      .query("SELECT COUNT(*) AS c FROM CommitteeReport")
      .get() as any;
    expect(reports.c).toBe(1);
  });

  test("replaces dissents when a revision provides new ones", async () => {
    await migrateRow(
      makeMietintoRow({
        JasenMielipideOsa: [
          makeDissent(),
          makeDissent({ OtsikkoTeksti: "Vastalause 2" }),
        ],
      }),
    );
    await migrateRow(
      makeMietintoRow({ JasenMielipideOsa: [makeDissent()] }, { id: "342500" }),
    );

    const dissents = db
      .query(
        "SELECT dissent_order FROM CommitteeReportDissent WHERE report_id = 342429",
      )
      .all() as any[];
    expect(dissents).toHaveLength(1);
  });

  test("does not fail the row when a signer person id is malformed", async () => {
    await migrateRow(
      makeMietintoRow({
        JasenMielipideOsa: makeDissent({
          SuppeaAllekirjoitusOsa: {
            Allekirjoittaja: {
              Henkilo: {
                EtuNimi: "Erkki",
                SukuNimi: "Esimerkki",
                "@_muuTunnus": "ei-numero",
              },
            },
          },
        }),
      }),
    );

    const dissents = db
      .query(
        "SELECT dissent_order FROM CommitteeReportDissent WHERE report_id = 342429",
      )
      .all() as any[];
    expect(dissents).toHaveLength(1);

    const signers = db
      .query(
        "SELECT person_id, last_name FROM CommitteeReportDissentSigner WHERE report_id = 342429",
      )
      .all() as any[];
    expect(signers).toHaveLength(1);
    expect(signers[0].person_id).toBeNull();
    expect(signers[0].last_name).toBe("Esimerkki");
  });
});
