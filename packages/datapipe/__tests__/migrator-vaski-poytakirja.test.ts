import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearStatementCache } from "../migrator/utils";
import type { VaskiEntry } from "../migrator/VaskiData/reader";
import createSubMigrator from "../migrator/VaskiData/submigrators/pöytäkirja";
import {
  createTestDb,
  seedSection,
  seedSession,
  seedSpeech,
} from "./helpers/setup-db";

function seedDefaultSessionAndSections(db: Database) {
  seedSession(db, {
    id: 2,
    key: "2017/2",
    number: 2,
    year: 2017,
    date: "2017-02-07",
    agenda_key: "PJ_2017_2",
    agenda_title: "Päiväjärjestys PJ 2/2017 vp",
  });
  seedSection(db, {
    id: 20,
    key: "2017/2/11",
    session_key: "2017/2",
    ordinal: 11,
    identifier: "3",
    title: "Jaana Pelkosen vapautuspyyntö",
    vaski_id: 35456,
  });
  seedSection(db, {
    id: 21,
    key: "2017/2/1",
    session_key: "2017/2",
    ordinal: 1,
    identifier: "1",
    title: "Nimenhuuto",
    vaski_id: 29133,
  });
}

function makeAsiakohta(overrides: Record<string, unknown> = {}) {
  return {
    KohtaNumero: "3",
    KohtaNimeke: {
      NimekeTeksti: "Jaana Pelkosen vapautuspyyntö",
    },
    KohtaAsia: {
      AsiakirjatyyppiNimi: "Vapautuspyyntö",
      EduskuntaTunnus: "VAP 1/2017 vp",
      "@_hyperlinkkiKoodi": "VAP 1/2017 vp",
    },
    PaatoksentekoToimenpide: {
      KohtaSisalto: {
        KappaleKooste: "Eduskunta hyväksyi vapautuspyynnön.",
      },
      "@_muuTunnus": "146502",
      "@_fraasiTunnus": "P_AKAS_6",
    },
    "@_muuTunnus": "35456",
    "@_kasittelyvaiheKoodi": "AKAS",
    "@_kohtaJNro": "11",
    "@_kohtatyyppiKoodi": "Asiakohta",
    "@_yleinenKasittelyvaiheKoodi": "AKAS",
    ...overrides,
  };
}

function makeMuuAsiakohta(overrides: Record<string, unknown> = {}) {
  return {
    KohtaNumero: "1",
    OtsikkoTeksti: "Nimenhuuto",
    KohtaAsiakirja: {
      AsiakirjatyyppiNimi: "Nimenhuutoraportti",
      "@_hyperlinkkiKoodi": "EDK-2017-AK-104325",
    },
    Toimenpide: {
      KohtaSisalto: {
        KappaleKooste: "Toimitettiin nimenhuuto.",
      },
      "@_muuTunnus": "124447",
      "@_fraasiTunnus": "K_106",
    },
    "@_muuTunnus": "29133",
    "@_kasittelyvaiheKoodi": "KOKNHU",
    "@_kohtaJNro": "1",
    "@_kohtatyyppiKoodi": "Asiakohta",
    "@_yleinenKasittelyvaiheKoodi": "KOKOUS",
    ...overrides,
  };
}

function makeRow(
  overrides: Partial<VaskiEntry> & {
    edkIdentifier?: string | null;
    parliamentIdentifier?: string;
    rootType?: string;
    mainItems?: Record<string, unknown>[];
    otherItems?: Record<string, unknown>[];
    includeSignature?: boolean;
  } = {},
): VaskiEntry {
  const edkIdentifier =
    overrides.edkIdentifier === undefined
      ? "EDK-2017-AK-104327"
      : overrides.edkIdentifier;
  const parliamentIdentifier =
    overrides.parliamentIdentifier ?? "PTK 2/2017 vp";
  const rootType = overrides.rootType ?? "Poytakirja";
  const mainItems = overrides.mainItems ?? [makeAsiakohta()];
  const otherItems = overrides.otherItems ?? [makeMuuAsiakohta()];
  const includeSignature = overrides.includeSignature ?? true;

  const julkaisuMetatieto: Record<string, unknown> = {
    "@_laadintaPvm": "2017-02-07",
  };
  if (edkIdentifier !== null) {
    julkaisuMetatieto["@_muuTunnus"] = edkIdentifier;
  }

  const poytakirja: Record<string, unknown> = {
    IdentifiointiOsa: {
      Nimeke: {
        NimekeTeksti: "Tiistai 7.2.2017 klo 14.00—15.00",
      },
    },
    "@_kokousAloitusHetki": "2017-02-07T14:00:00",
    "@_kokousLopetusHetki": "2017-02-07T15:00:00",
    Asiakohta: mainItems,
    MuuAsiakohta: otherItems,
  };
  if (includeSignature) {
    poytakirja.AllekirjoitusOsa = { JohdantoTeksti: "Pöytäkirja tarkastettu" };
  }

  return {
    id: "2921",
    eduskuntaTunnus: parliamentIdentifier,
    status: "5",
    created: "2021-11-18 11:12:24",
    attachmentGroupId: "400001",
    rootType,
    _source: {
      page: 30,
      parsedKey: "parsed/VaskiData/page_000000000030+000000000129.json",
      vaskiPath: "vaski-data/pöytäkirja/page_000000000030+000000000129.json",
    },
    contents: {
      Siirto: {
        SiirtoMetatieto: {
          JulkaisuMetatieto: julkaisuMetatieto,
        },
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            Poytakirja: poytakirja,
          },
        },
      },
    },
    ...overrides,
  };
}

describe("Vaski pöytäkirja submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => Promise<void>;
  let overwriteLogDir: string;
  let reportLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    overwriteLogDir = mkdtempSync(
      join(tmpdir(), "vaski-poytakirja-overwrite-"),
    );
    reportLogDir = mkdtempSync(join(tmpdir(), "vaski-poytakirja-report-"));
    process.env.MIGRATOR_OVERWRITE_LOG_DIR = overwriteLogDir;
    process.env.MIGRATOR_REPORT_LOG_DIR = reportLogDir;
    db = createTestDb(20);
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_OVERWRITE_LOG_DIR;
    delete process.env.MIGRATOR_REPORT_LOG_DIR;
    rmSync(overwriteLogDir, { recursive: true, force: true });
    rmSync(reportLogDir, { recursive: true, force: true });
  });

  test("updates Session and Section minutes columns", async () => {
    seedDefaultSessionAndSections(db);

    await migrateRow(makeRow());

    const session = db
      .query(
        "SELECT minutes_document_id, minutes_edk_identifier, minutes_status, minutes_title, minutes_start_time, minutes_end_time, minutes_has_signature, minutes_agenda_item_count, minutes_other_item_count FROM Session WHERE key = '2017/2'",
      )
      .get() as any;
    expect(session.minutes_document_id).toBe(2921);
    expect(session.minutes_edk_identifier).toBe("EDK-2017-AK-104327");
    expect(session.minutes_status).toBe("5");
    expect(session.minutes_title).toBe("Tiistai 7.2.2017 klo 14.00—15.00");
    expect(session.minutes_start_time).toBe("2017-02-07T14:00:00");
    expect(session.minutes_end_time).toBe("2017-02-07T15:00:00");
    expect(session.minutes_has_signature).toBe(1);
    expect(session.minutes_agenda_item_count).toBe(1);
    expect(session.minutes_other_item_count).toBe(1);

    const sectionRows = db
      .query(
        "SELECT key, minutes_match_mode, minutes_item_identifier, minutes_item_title, minutes_related_document_identifier, minutes_content_text FROM Section WHERE session_key = '2017/2' ORDER BY key",
      )
      .all() as any[];
    expect(sectionRows).toHaveLength(2);
    const main = sectionRows.find((row) => row.key === "2017/2/11");
    const other = sectionRows.find((row) => row.key === "2017/2/1");
    expect(main.minutes_match_mode).toBe("direct");
    expect(main.minutes_item_identifier).toBe(35456);
    expect(main.minutes_item_title).toBe("Jaana Pelkosen vapautuspyyntö");
    expect(main.minutes_related_document_identifier).toBe("VAP 1/2017 vp");
    expect(main.minutes_content_text).toContain("Eduskunta hyväksyi");
    expect(other.minutes_match_mode).toBe("direct");
    expect(other.minutes_item_identifier).toBe(29133);
    expect(other.minutes_item_title).toBe("Nimenhuuto");
    expect(other.minutes_related_document_identifier).toBe(
      "EDK-2017-AK-104325",
    );
    expect(other.minutes_content_text).toContain("Toimitettiin nimenhuuto");
  });

  test("captures all related document references from array-form minutes entries", async () => {
    seedDefaultSessionAndSections(db);

    await migrateRow(
      makeRow({
        mainItems: [
          makeAsiakohta({
            KohtaAsia: [
              {
                AsiakirjatyyppiNimi: "Hallituksen esitys",
                EduskuntaTunnus: "HE 10/2017 vp",
              },
              {
                AsiakirjatyyppiNimi: "Valiokunnan mietintö",
                MultiViiteTunnus: "VaVM 1, 2/2017 vp",
              },
            ],
            KohtaAsiakirja: [
              {
                AsiakirjatyyppiNimi: "Hallituksen esitys",
                "@_hyperlinkkiKoodi": "/valtiopaivaasiakirjat/HE+11/2017+vp",
              },
            ],
          }),
        ],
      }),
    );

    const refs = db
      .query(
        "SELECT document_identifier, document_type FROM SectionDocumentReference WHERE section_key = '2017/2/11' ORDER BY document_identifier",
      )
      .all() as Array<{
      document_identifier: string;
      document_type: string | null;
    }>;

    expect(refs).toHaveLength(4);
    expect(refs.map((row) => row.document_identifier)).toEqual([
      "HE 10/2017 vp",
      "HE 11/2017 vp",
      "VAVM 1/2017 vp",
      "VAVM 2/2017 vp",
    ]);
    expect(
      refs.find((row) => row.document_identifier === "HE 10/2017 vp")
        ?.document_type,
    ).toBe("Hallituksen esitys");
    expect(
      refs.find((row) => row.document_identifier === "VAVM 1/2017 vp")
        ?.document_type,
    ).toBe("Valiokunnan mietintö");
  });

  test("uses MuuViite.ViiteTeksti as related document identifier fallback", async () => {
    seedDefaultSessionAndSections(db);

    await migrateRow(
      makeRow({
        mainItems: [
          makeAsiakohta({
            KohtaAsia: {
              AsiakirjatyyppiNimi: "Hallituksen esitys",
              MuuViite: {
                ViiteTeksti: "HE 15/2017 vp",
              },
            },
          }),
        ],
      }),
    );

    const refs = db
      .query(
        "SELECT document_identifier, document_type FROM SectionDocumentReference WHERE section_key = '2017/2/11' ORDER BY document_identifier",
      )
      .all() as Array<{
      document_identifier: string;
      document_type: string | null;
    }>;

    expect(refs).toEqual([
      {
        document_identifier: "HE 15/2017 vp",
        document_type: "Hallituksen esitys",
      },
    ]);
  });

  test("skips non-plenary committee minutes", async () => {
    seedDefaultSessionAndSections(db);

    await migrateRow(
      makeRow({
        parliamentIdentifier: "HaVP 1/2017 vp",
        rootType: "KokousPoytakirja",
      }),
    );

    const session = db
      .query(
        "SELECT minutes_document_id, minutes_edk_identifier FROM Session WHERE key = '2017/2'",
      )
      .get() as any;
    expect(session.minutes_document_id).toBeNull();
    expect(session.minutes_edk_identifier).toBeNull();
  });

  test("uses parent_item_identifier fallback for Section link", async () => {
    seedSession(db, {
      id: 3,
      key: "2017/3",
      number: 3,
      year: 2017,
      date: "2017-02-08",
      agenda_key: "PJ_2017_3",
      agenda_title: "Päiväjärjestys PJ 3/2017 vp",
    });
    seedSection(db, {
      id: 30,
      key: "2017/3/4",
      session_key: "2017/3",
      ordinal: 4,
      identifier: "4",
      title: "Suulliset kysymykset",
      vaski_id: 1409,
    });

    await migrateRow(
      makeRow({
        id: "3001",
        parliamentIdentifier: "PTK 3/2017 vp",
        mainItems: [
          makeAsiakohta({
            KohtaNumero: "4.1",
            KohtaNimeke: {
              NimekeTeksti: "Suullinen kysymys testistä",
            },
            "@_muuTunnus": "1540",
            "@_paakohtaTunnus": "1409",
            "@_kohtaJNro": "4",
          }),
        ],
        otherItems: [],
      }),
    );

    const section = db
      .query(
        "SELECT minutes_match_mode, minutes_item_identifier, minutes_parent_item_identifier, minutes_item_number, minutes_item_title FROM Section WHERE key = '2017/3/4'",
      )
      .get() as any;
    expect(section.minutes_match_mode).toBe("parent_fallback");
    expect(section.minutes_item_identifier).toBe(1540);
    expect(section.minutes_parent_item_identifier).toBe("1409");
    expect(section.minutes_item_number).toBe("4.1");
    expect(section.minutes_item_title).toBe("Suullinen kysymys testistä");
  });

  test("moves speech text to SpeechContent and keeps section minutes compact", async () => {
    seedDefaultSessionAndSections(db);
    seedSpeech(db, {
      id: 5001,
      key: "speech-5001",
      session_key: "2017/2",
      section_key: "2017/2/11",
      ordinal: 20170207140555,
      ordinal_number: 1,
      speech_type: "T",
      request_method: "I",
      request_time: "2017-02-07T14:05:55",
      person_id: 1147,
      first_name: "Antti",
      last_name: "Lindtman",
      gender: "mies",
      party_abbreviation: "sd",
      has_spoken: 1,
      ministry: null,
      modified_datetime: "2017-02-07T14:05:55",
      created_datetime: "2017-02-07T14:05:55",
      imported_datetime: "2017-02-07T14:05:55",
      order_raw: "2017-02-07 14:05:55",
    });

    await migrateRow(
      makeRow({
        mainItems: [
          makeAsiakohta({
            KeskusteluToimenpide: {
              PuheenvuoroToimenpide: [
                {
                  AjankohtaTeksti: "14.05",
                  Toimija: {
                    Henkilo: {
                      EtuNimi: "Antti",
                      SukuNimi: "Lindtman",
                      "@_muuTunnus": "1147",
                    },
                  },
                  PuheenvuoroOsa: {
                    KohtaSisalto: {
                      KappaleKooste: [
                        "Arvoisa puhemies! Tämä on testipuheenvuoro.",
                        "Tämä on toinen kappale samasta puheesta.",
                      ],
                    },
                    "@_kieliKoodi": "fi",
                    "@_puheenvuoroAloitusHetki": "2017-02-07T14:05:55",
                    "@_puheenvuoroLopetusHetki": "2017-02-07T14:07:00",
                    "@_puheenvuoroJNro": "1",
                  },
                  "@_muuTunnus": "300434",
                  "@_puheenvuoroAloitusHetki": "2017-02-07T14:05:55",
                  "@_puheenvuoroLuokitusKoodi": "T",
                },
              ],
            },
          }),
        ],
      }),
    );

    const speechContent = db
      .query(
        "SELECT speech_id, session_key, section_key, source_document_id, source_item_identifier, source_entry_order, source_speech_order, speech_type_code, language_code, start_time, end_time, content FROM SpeechContent WHERE speech_id = 5001",
      )
      .get() as any;
    expect(speechContent.speech_id).toBe(5001);
    expect(speechContent.session_key).toBe("2017/2");
    expect(speechContent.section_key).toBe("2017/2/11");
    expect(speechContent.source_document_id).toBe(2921);
    expect(speechContent.source_item_identifier).toBe(35456);
    expect(speechContent.source_entry_order).toBe(1);
    expect(speechContent.source_speech_order).toBe(1);
    expect(speechContent.speech_type_code).toBe("T");
    expect(speechContent.language_code).toBe("fi");
    expect(speechContent.start_time).toBe("2017-02-07T14:05:55");
    expect(speechContent.end_time).toBe("2017-02-07T14:07:00");
    expect(speechContent.content).toContain("testipuheenvuoro");

    const section = db
      .query("SELECT minutes_content_text FROM Section WHERE key = '2017/2/11'")
      .get() as any;
    expect(section.minutes_content_text).toContain(
      "Eduskunta hyväksyi vapautuspyynnön.",
    );
    expect(section.minutes_content_text).not.toContain("testipuheenvuoro");
  });

  test("overwrites duplicate by session_key and logs diff", async () => {
    seedDefaultSessionAndSections(db);

    await migrateRow(
      makeRow({
        id: "2921",
      }),
    );
    await migrateRow(
      makeRow({
        id: "9001",
        created: "2024-01-10 12:00:00",
        contents: {
          Siirto: {
            SiirtoMetatieto: {
              JulkaisuMetatieto: {
                "@_muuTunnus": "EDK-2017-AK-NEW",
                "@_laadintaPvm": "2017-02-07",
              },
            },
            SiirtoAsiakirja: {
              RakenneAsiakirja: {
                Poytakirja: {
                  IdentifiointiOsa: {
                    Nimeke: {
                      NimekeTeksti: "Updated minutes title",
                    },
                  },
                  "@_kokousAloitusHetki": "2017-02-07T14:00:00",
                  "@_kokousLopetusHetki": "2017-02-07T15:00:00",
                  Asiakohta: [makeAsiakohta()],
                  MuuAsiakohta: [makeMuuAsiakohta()],
                },
              },
            },
          },
        } as any,
      }),
    );

    const session = db
      .query(
        "SELECT minutes_document_id, minutes_edk_identifier, minutes_title FROM Session WHERE key = '2017/2'",
      )
      .get() as any;
    expect(session.minutes_document_id).toBe(9001);
    expect(session.minutes_edk_identifier).toBe("EDK-2017-AK-NEW");
    expect(session.minutes_title).toBe("Updated minutes title");

    const updatedSectionCount = (
      db
        .query(
          "SELECT COUNT(*) AS c FROM Section WHERE session_key = '2017/2' AND minutes_item_identifier IS NOT NULL",
        )
        .get() as any
    ).c;
    expect(updatedSectionCount).toBe(2);

    const logFiles = readdirSync(overwriteLogDir).filter((f) =>
      f.endsWith(".json"),
    );
    expect(logFiles.length).toBe(1);
  });

  test("skips parse error and writes migration report", async () => {
    seedDefaultSessionAndSections(db);

    await migrateRow(
      makeRow({
        edkIdentifier: null,
      }),
    );

    const session = db
      .query(
        "SELECT minutes_document_id, minutes_edk_identifier FROM Session WHERE key = '2017/2'",
      )
      .get() as any;
    expect(session.minutes_document_id).toBeNull();
    expect(session.minutes_edk_identifier).toBeNull();

    const reportFiles = readdirSync(reportLogDir).filter((f) =>
      f.endsWith(".json"),
    );
    expect(reportFiles.length).toBe(1);
    expect(reportFiles[0]).toContain("parse_error_row_skipped");
  });
});
