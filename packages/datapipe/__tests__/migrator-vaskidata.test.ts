import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDb } from "./helpers/setup-db";
import createMigrator, { flushVotes } from "../migrator/VaskiData/migrator";
import { clearStatementCache } from "../migrator/utils";

describe("VaskiData migrator", () => {
  let db: Database;
  let migrate: (row: any) => Promise<void>;

  beforeEach(() => {
    clearStatementCache();
    db = createTestDb(24);
    migrate = createMigrator(db);
  });

  afterEach(() => {
    flushVotes();
    db.close();
  });

  test("stores item-level section references for minutes section linking", async () => {
    db.run(
      "INSERT INTO Session (id, number, key, date, year, type, state) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 133, "2025/133", "2025-12-19", 2025, "TAYSINT", "LOPETETTU"],
    );
    db.run(
      "INSERT INTO Section (id, key, title, session_key, ordinal, vaski_id) VALUES (?, ?, ?, ?, ?, ?)",
      [1, "2025/133/1", "Nimenhuuto", "2025/133", 1, 219389],
    );

    await migrate({
      id: "328223",
      eduskuntaTunnus: "PTK 133/2025 vp",
      status: "Tarkistettu",
      created: "2025-12-19T10:00:00",
      attachmentGroupId: null,
      contents: {
        Siirto: {
          Sanomavalitys: {},
          SiirtoMetatieto: {
            JulkaisuMetatieto: {
              IdentifiointiOsa: {
                AsiakirjatyyppiNimi: "Pöytäkirja",
                EduskuntaTunniste: {
                  AsiakirjatyyppiKoodi: "PTK",
                  AsiakirjaNroTeksti: "133",
                  ValtiopaivavuosiTeksti: "2025",
                },
              },
            },
          },
          SiirtoAsiakirja: {
            RakenneAsiakirja: {
              Poytakirja: {
                MuuAsiakohta: [
                  {
                    Otsikko: "Nimenhuuto",
                    "@_muuTunnus": "219389",
                    "@_paakohtaTunnus": "219390",
                    Toimenpide: {
                      "@_muuTunnus": "951346",
                    },
                  },
                ],
              },
            },
          },
        },
      },
    });

    flushVotes();

    const sectionRow = db
      .query(
        `SELECT source_section_id, source_parent_section_id, document_id
         FROM Section
         WHERE key = '2025/133/1'`,
      )
      .get() as any;
    expect(sectionRow.source_section_id).toBe(219389);
    expect(sectionRow.source_parent_section_id).toBe(219390);
    expect(sectionRow.document_id).toBe(328223);

    const documentRow = db
      .query(
        `SELECT type_slug, root_family, eduskunta_tunnus
         FROM Document
         WHERE id = 328223`,
      )
      .get() as any;
    expect(documentRow.type_slug).toBe("poytakirja");
    expect(documentRow.root_family).toBe("Poytakirja");
    expect(documentRow.eduskunta_tunnus).toBe("PTK 133/2025 vp");

    const minutesItems = db
      .query(
        `SELECT item_type, source_item_id, source_parent_item_id
         FROM SessionMinutesItem
         WHERE minutes_document_id = 328223`,
      )
      .all() as any[];
    expect(minutesItems.length).toBe(1);
    expect(minutesItems[0].item_type).toBe("muu_asiakohta");
    expect(minutesItems[0].source_item_id).toBe(219389);
    expect(minutesItems[0].source_parent_item_id).toBe(219390);

    const sessionDoc = db
      .query(
        `SELECT minutes_document_id
         FROM Session
         WHERE key = '2025/133'`,
      )
      .get() as any;
    expect(sessionDoc.minutes_document_id).toBe(328223);
  });

  test("stores root_family in Document", async () => {
    await migrate({
      id: "1",
      eduskuntaTunnus: "HE 1/2025 vp",
      status: "5",
      created: "2025-01-01T10:00:00",
      attachmentGroupId: null,
      contents: {
        Siirto: {
          Sanomavalitys: {},
          SiirtoMetatieto: {
            JulkaisuMetatieto: {
              IdentifiointiOsa: {
                AsiakirjatyyppiNimi: "Hallituksen esitys",
                EduskuntaTunniste: {
                  AsiakirjatyyppiKoodi: "HE",
                  AsiakirjaNroTeksti: "1",
                  ValtiopaivavuosiTeksti: "2025",
                },
              },
            },
          },
          SiirtoAsiakirja: {
            RakenneAsiakirja: {
              HallituksenEsitys: {},
            },
          },
        },
      },
    });

    flushVotes();

    const row = db.query("SELECT root_family FROM Document WHERE id = 1").get() as any;
    expect(row.root_family).toBe("HallituksenEsitys");
  });

  test("loads speeches into SessionSectionSpeech tied to section", async () => {
    db.run(
      "INSERT INTO Session (id, number, key, date, year, type, state) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [1, 45, "2025/45", "2025-03-12", 2025, "TAYSINT", "LOPETETTU"],
    );
    db.run(
      "INSERT INTO Section (id, key, title, session_key, ordinal, vaski_id) VALUES (?, ?, ?, ?, ?, ?)",
      [1, "2025/45/2", "Asia 2", "2025/45", 2, 9002],
    );

    await migrate({
      id: "900045",
      eduskuntaTunnus: "PTK 45/2025 vp",
      status: "5",
      created: "2025-03-12T12:00:00",
      attachmentGroupId: null,
      contents: {
        Siirto: {
          Sanomavalitys: {},
          SiirtoMetatieto: {
            JulkaisuMetatieto: {
              IdentifiointiOsa: {
                AsiakirjatyyppiNimi: "Pöytäkirjan asiakohta",
                EduskuntaTunniste: {
                  AsiakirjatyyppiKoodi: "PTK",
                  AsiakirjaNroTeksti: "45",
                  ValtiopaivavuosiTeksti: "2025",
                },
              },
            },
          },
          SiirtoAsiakirja: {
            RakenneAsiakirja: {
              PoytakirjaAsiakohta: {
                MuuAsiakohta: [
                  {
                    Otsikko: "Asia 2",
                    "@_muuTunnus": "9002",
                    KeskusteluToimenpide: {
                      PuheenvuoroToimenpide: {
                        Toimija: {
                          Henkilo: {
                            "@_muuTunnus": "1000",
                            EtuNimi: "Matti",
                            SukuNimi: "Meikalainen",
                            LisatietoTeksti: "kesk",
                            AsemaTeksti: "kansanedustaja",
                          },
                        },
                        TarkenneTeksti: "(vastauspuheenvuoro)",
                        PuheenvuoroOsa: {
                          "@_puheenvuoroAloitusHetki": "2025-03-12T12:30:00",
                          "@_puheenvuoroLopetusHetki": "2025-03-12T12:35:00",
                          "@_puheenvuoroJNro": "1",
                          KohtaSisalto: {
                            KappaleKooste: "Testipuheenvuoro sisalto.",
                          },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    });

    flushVotes();

    const speech = db
      .query(
        `SELECT session_key, section_key, speech_ordinal, content, speech_type
         FROM SessionSectionSpeech
         WHERE source_document_id = 900045`,
      )
      .get() as any;

    expect(speech.session_key).toBe("2025/45");
    expect(speech.section_key).toBe("2025/45/2");
    expect(speech.speech_ordinal).toBe(1);
    expect(speech.content).toContain("Testipuheenvuoro");
    expect(speech.speech_type).toBe("(vastauspuheenvuoro)");
  });
});
