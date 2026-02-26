import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parseRichTextDocument } from "../../shared/typings/RichText";
import { clearStatementCache } from "../migrator/utils";
import type { VaskiEntry } from "../migrator/VaskiData/reader";
import createSubMigrator from "../migrator/VaskiData/submigrators/hallituksen_esitys";
import { createTestDb } from "./helpers/setup-db";

function makeHallituksenEsitysRow(
  overrides: Partial<VaskiEntry> = {},
): VaskiEntry {
  return {
    id: "9101",
    eduskuntaTunnus: "HE 1/2024 vp",
    status: "5",
    created: "2024-01-10 11:00:00",
    attachmentGroupId: "1",
    _source: {
      page: 1,
      parsedKey: "parsed/VaskiData/page_000000000001+000000000100.json",
      vaskiPath:
        "vaski-data/hallituksen_esitys/page_000000000001+000000000100.json",
    },
    contents: {
      Siirto: {
        SiirtoMetatieto: {
          JulkaisuMetatieto: {
            Aihe: [{ AiheTeksti: "Verotus", "@_muuTunnus": "yso:p1" }],
          },
        },
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            HallituksenEsitys: {
              IdentifiointiOsa: {
                Nimeke: { NimekeTeksti: "Hallituksen esitys testiasiasta" },
                Toimija: { YhteisoTeksti: "Valtioneuvosto" },
              },
              SisaltoKuvaus: {
                LihavaKursiiviOtsikkoTeksti: "Tiivistelmä",
                KappaleKooste: {
                  AsiakirjaViiteTunnus: "HE 1/2024 vp",
                  "#text": "Tiivistelmäteksti.",
                },
              },
              PerusteluOsa: {
                KappaleKooste: "Perusteluteksti.",
              },
              PonsiOsa: {
                JohdantoTeksti: "Esitetään,",
                SisennettyKappaleKooste: {
                  KursiiviTeksti: "että laki hyväksytään",
                  "#text": ".",
                },
              },
              LiiteOsa: {
                KappaleKooste: "Liiteteksti.",
              },
              AllekirjoitusOsa: {
                PaivaysKooste: "Helsingissä 1.1.2024",
                Allekirjoittaja: {
                  Henkilo: {
                    EtuNimi: "Matti",
                    SukuNimi: "Meikalainen",
                    AsemaTeksti: "ministeri",
                  },
                },
              },
              SaadosOsa: {
                Saados: {
                  SaadosNimeke: {
                    SaadostyyppiKooste: "Laki",
                    SaadosNimekeKooste: "testilaiksi",
                  },
                },
              },
              "@_laadintaPvm": "2024-01-01",
            },
          },
        },
      },
    },
    ...overrides,
  };
}

describe("Vaski hallituksen esitys submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => Promise<void>;

  beforeEach(() => {
    clearStatementCache();
    db = createTestDb(20);
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
  });

  test("stores rich text JSON fields alongside plain text", async () => {
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9101, 'hallituksen_esitys', NULL, 'test')",
    );

    await migrateRow(makeHallituksenEsitysRow());

    const proposal = db
      .query(
        "SELECT parliament_identifier, summary_text, summary_rich_text, justification_text, justification_rich_text, proposal_text, proposal_rich_text, appendix_text, appendix_rich_text FROM GovernmentProposal WHERE id = 9101",
      )
      .get() as any;

    expect(proposal.parliament_identifier).toBe("HE 1/2024 vp");
    expect(proposal.summary_text).toContain("Tiivistelmäteksti.");
    expect(proposal.justification_text).toContain("Perusteluteksti.");
    expect(proposal.proposal_text).toContain("että laki hyväksytään.");
    expect(proposal.appendix_text).toContain("Liiteteksti.");

    const summaryDoc = parseRichTextDocument(proposal.summary_rich_text);
    const proposalDoc = parseRichTextDocument(proposal.proposal_rich_text);

    expect(summaryDoc).not.toBeNull();
    expect(proposalDoc).not.toBeNull();
    expect(summaryDoc?.blocks.length).toBeGreaterThan(0);
    expect(proposalDoc?.blocks.length).toBeGreaterThan(0);
  });
});
