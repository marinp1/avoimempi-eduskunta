import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import createMigrator from "../migrator/MemberOfParliament/migrator";
import { clearStatementCache } from "../migrator/utils";
import { createTestDb } from "./helpers/setup-db";

type RepresentativePayload = RawDataModels["MemberOfParliament"];

const makeRepresentativePayload = (
  overrides: Partial<RepresentativePayload> = {},
): RepresentativePayload => {
  const xmlData = {
    Henkilo: {
      LajitteluNimi: "kankaanniemi toimi",
      MatrikkeliNimi: "Toimi Kankaanniemi",
      SyntymaPvm: "01.01.1950",
      SyntymaPaikka: "Tyrvää",
      SukuPuoliKoodi: "Mies",
      NykyinenKotikunta: "Sastamala",
      Ammatti: "sosionomi",
      LisaTiedot: "",
      Vaalipiirit: {
        NykyinenVaalipiiri: {
          Nimi: "Keski-Suomi",
          Tunnus: "03",
          AlkuPvm: "22.04.2015",
          LoppuPvm: "04.04.2023",
        },
      },
      Edustajatoimet: {
        Edustajatoimi: {
          AlkuPvm: "22.04.2015",
          LoppuPvm: "04.04.2023",
        },
      },
      Kansanedustajana: {
        Keskeytys: {
          TilallaSelite: "Edeltäjä",
          TilallaHenkilo: "Teuvo Hakkarainen /ps",
          AlkuPvm: "02.07.2019",
          LoppuPvm: "04.04.2023",
        },
      },
      Eduskuntaryhmat: {
        EdellisetEduskuntaryhmat: {
          Eduskuntaryhma: [
            {
              Nimi: "Perussuomalaisten eduskuntaryhmä",
              Tunnus: "ps01",
              Jasenyys: {
                AlkuPvm: "22.04.2015",
                LoppuPvm: "16.04.2019",
              },
            },
            {
              Nimi: "Perussuomalaisten eduskuntaryhmä",
              Tunnus: "ps01",
              Jasenyys: {
                AlkuPvm: "02.07.2019",
                LoppuPvm: "04.04.2023",
              },
            },
          ],
        },
      },
    },
  };

  return {
    personId: "175",
    lastname: "Kankaanniemi",
    firstname: "Toimi",
    party: "ps",
    minister: "f",
    XmlData: null,
    XmlDataSv: null,
    XmlDataFi: JSON.stringify(xmlData),
    XmlDataEn: null,
    ...overrides,
  } as RepresentativePayload;
};

describe("MemberOfParliament migrator", () => {
  let db: Database;
  let migrate: (data: RepresentativePayload) => void | Promise<void>;

  beforeEach(() => {
    clearStatementCache();
    db = createTestDb(12);
    migrate = createMigrator(db);
  });

  afterEach(() => {
    db.close();
  });

  test("splits term rows by group-membership gap and uses AlkuPvm for joining date", async () => {
    await migrate(makeRepresentativePayload());

    const terms = db
      .query(
        "SELECT start_date, end_date FROM Term WHERE person_id = ? ORDER BY start_date",
      )
      .all(175) as Array<{ start_date: string; end_date: string | null }>;

    expect(terms).toEqual([
      { start_date: "2015-04-22", end_date: "2019-04-16" },
      { start_date: "2019-07-02", end_date: "2023-04-04" },
    ]);

    const joiningRows = db
      .query(
        "SELECT start_date, replacement_person FROM PeopleJoiningParliament WHERE person_id = ?",
      )
      .all(175) as Array<{ start_date: string; replacement_person: string }>;

    expect(joiningRows).toEqual([
      {
        start_date: "2019-07-02",
        replacement_person: "Edeltäjä Teuvo Hakkarainen /ps",
      },
    ]);
  });

  test("keeps original term rows when no group memberships are available", async () => {
    const payload = makeRepresentativePayload({
      personId: "176",
      firstname: "Testi",
      lastname: "IlmanRyhmaa",
      XmlDataFi: JSON.stringify({
        Henkilo: {
          LajitteluNimi: "ilmanryhmaa testi",
          MatrikkeliNimi: "Testi IlmanRyhmaa",
          SyntymaPvm: "01.01.1960",
          SyntymaPaikka: "Helsinki",
          SukuPuoliKoodi: "Mies",
          NykyinenKotikunta: "Helsinki",
          Ammatti: "testaaja",
          LisaTiedot: "",
          Vaalipiirit: {
            NykyinenVaalipiiri: {
              Nimi: "Helsinki",
              Tunnus: "01",
              AlkuPvm: "01.01.2000",
              LoppuPvm: "31.12.2004",
            },
          },
          Edustajatoimet: {
            Edustajatoimi: {
              AlkuPvm: "01.01.2000",
              LoppuPvm: "31.12.2004",
            },
          },
          Eduskuntaryhmat: {},
        },
      }),
    });

    await migrate(payload);

    const terms = db
      .query(
        "SELECT start_date, end_date FROM Term WHERE person_id = ? ORDER BY start_date",
      )
      .all(176) as Array<{ start_date: string; end_date: string | null }>;

    expect(terms).toEqual([
      { start_date: "2000-01-01", end_date: "2004-12-31" },
    ]);
  });
});
