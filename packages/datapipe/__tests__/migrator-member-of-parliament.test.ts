import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import createMigrator from "../migrator/fn/MemberOfParliament";
import { clearStatementCache } from "../migrator/utils";
import { createTestDb } from "./helpers/setup-db";

type RepresentativePayload = DataModel.Representative;

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
    XmlDataFi: JSON.stringify(
      xmlData,
    ) as unknown as RepresentativePayload["XmlDataFi"],
    XmlDataEn: null,
    ...overrides,
  } as RepresentativePayload;
};

describe("MemberOfParliament migrator", () => {
  let db: Database;
  let migrate: ReturnType<typeof createMigrator>;

  beforeEach(() => {
    clearStatementCache();
    db = createTestDb(25);
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
      }) as unknown as RepresentativePayload["XmlDataFi"],
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

  test("infers and upserts Government ranges and links memberships by foreign key", async () => {
    const payload = makeRepresentativePayload({
      personId: "177",
      firstname: "Hallitus",
      lastname: " Testaaja ",
      XmlDataFi: JSON.stringify({
        Henkilo: {
          LajitteluNimi: "testaaja hallitus",
          MatrikkeliNimi: "Hallitus Testaaja",
          SyntymaPvm: "01.01.1970",
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
              LoppuPvm: "31.12.2001",
            },
          },
          Edustajatoimet: {
            Edustajatoimi: {
              AlkuPvm: "01.01.2000",
              LoppuPvm: "31.12.2001",
            },
          },
          Eduskuntaryhmat: {},
          ValtioneuvostonJasenyydet: {
            Jasenyys: [
              {
                Hallitus: "  Testihallitus ",
                Nimi: " Ministeri ",
                Ministeriys: " Testiministeriö ",
                AlkuPvm: "01.01.2000",
                LoppuPvm: "31.12.2000",
              },
              {
                Hallitus: "Testihallitus",
                Nimi: "Ministeri",
                Ministeriys: "Testiministeriö",
                AlkuPvm: "01.01.2001",
                LoppuPvm: "31.12.2001",
              },
            ],
          },
        },
      }) as unknown as RepresentativePayload["XmlDataFi"],
    });

    await migrate(payload);

    const representative = db
      .query("SELECT last_name FROM Representative WHERE person_id = ?")
      .get(177) as { last_name: string } | null;
    expect(representative?.last_name).toBe("Testaaja");

    const government = db
      .query(
        "SELECT id, name, start_date, end_date FROM Government WHERE name = ?",
      )
      .get("Testihallitus") as {
      id: number;
      name: string;
      start_date: string;
      end_date: string | null;
    } | null;

    expect(government).not.toBeNull();
    expect(government?.start_date).toBe("2000-01-01");
    expect(government?.end_date).toBe("2001-12-31");

    const memberships = db
      .query(
        "SELECT name, ministry, government, government_id FROM GovernmentMembership WHERE person_id = ? ORDER BY start_date",
      )
      .all(177) as Array<{
      name: string | null;
      ministry: string | null;
      government: string;
      government_id: number;
    }>;

    expect(memberships).toHaveLength(2);
    expect(memberships[0].name).toBe("Ministeri");
    expect(memberships[0].ministry).toBe("Testiministeriö");
    expect(memberships[0].government).toBe("Testihallitus");
    expect(memberships[1].government).toBe("Testihallitus");
    expect(government).not.toBeNull();
    expect(memberships[0].government_id).toBe(government!.id);
    expect(memberships[1].government_id).toBe(government!.id);
  });
});
