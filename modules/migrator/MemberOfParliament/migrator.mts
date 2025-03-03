import { TransactionSQL } from "bun";
import {
  Committee,
  CommitteeMembership,
  Education,
  ElectoralDistrict,
  ParliamentaryGroupMembership,
  ParliamentGroup,
  Representative,
  RepresentativeTerm,
} from "./model.mts";

const parseDate = (date?: string | null): string | null => {
  if (!date) return null;
  if (/^\d{4}$/.test(date)) {
    return `${date}-01-01`;
  }
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
    const [d, m, y] = date.split(".");
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4} [A-z]+$/.test(date)) {
    const [y, param] = date.split(" ");
    let month = (() => {
      switch (param.toUpperCase()) {
        case "I":
          return 1;
        case "II":
          return 2;
        case "III":
          return 3;
        case "IV":
          return 4;
        case "V":
          return 5;
        case "Y":
          return 1;
        default:
          throw new Error(`Unknown month ${date}`);
      }
    })();
    return `${y}-${month}-01`;
  }
  console.warn(`Unknown format for ${date}`);
  return null;
};

const parseYear = (year: string): number | null => {
  const parsed = parseInt(year);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

const removeNullEntries = <T extends Record<string, any>>(
  arr: T[],
  excludes: Array<keyof T> = []
) => {
  const resp = arr.filter((obj) =>
    Object.entries(obj)
      .filter(([k]) => !excludes.includes(k))
      .some(([, v]) => v !== null)
  );
  if (process.env.DEBUG) console.log(resp);
  return resp;
};

export default (sql: TransactionSQL) =>
  async (data: Modules.Parser.MemberOfParliament) => {
    if (process.env.DEBUG) console.log("Mapping", data.lastname, data.personId);
    const representativeRow: Representative = {
      person_id: Number(data.personId),
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.XmlDataFi.Henkilo.SahkoPosti || undefined,
      birth_year: data.XmlDataFi.Henkilo.SyntymaPvm
        ? parseInt(data.XmlDataFi.Henkilo.SyntymaPvm.split("-")[0])
        : undefined,
      birth_place: data.XmlDataFi.Henkilo.SyntymaPaikka || undefined,
      gender: data.XmlDataFi.Henkilo.SukuPuoliKoodi || undefined,
      home_municipality: data.XmlDataFi.Henkilo.NykyinenKotikunta || undefined,
      profession: data.XmlDataFi.Henkilo.Ammatti,
      party: data.party,
      minister: data.minister !== "f",
    };

    // Mapping Electoral Districts
    const electoralDistrictRows: ElectoralDistrict[] = removeNullEntries(
      [data.XmlDataFi.Henkilo.Vaalipiirit.EdellisetVaalipiirit.VaaliPiiri]
        .flat()
        .map((vaaliPiiri) => ({
          person_id: representativeRow.person_id,
          name: vaaliPiiri.Nimi ?? null,
          start_date: parseDate(vaaliPiiri.AlkuPvm)!,
          end_date: parseDate(vaaliPiiri.LoppuPvm),
        })),
      ["person_id"]
    );

    // Mapping Representative Terms
    const representativeTermRows: RepresentativeTerm[] = removeNullEntries(
      [data.XmlDataFi.Henkilo.Edustajatoimet.Edustajatoimi]
        .flat()
        .map((toimi) => ({
          person_id: representativeRow.person_id,
          start_date: parseDate(toimi.AlkuPvm)!,
          end_date: parseDate(toimi.LoppuPvm)!,
        })),
      ["person_id"]
    );

    // Mapping Parliamentary Groups
    const parliamentaryGroupMembershipRows: ParliamentaryGroupMembership[] =
      removeNullEntries(
        [
          data.XmlDataFi.Henkilo.Eduskuntaryhmat.EdellisetEduskuntaryhmat
            ?.Eduskuntaryhma,
        ]
          .flat()
          .filter((s) => !!s)
          .flatMap((eduskuntaryhma) =>
            [eduskuntaryhma.Jasenyys].flat().map((jasenyys) => ({
              person_id: representativeRow.person_id,
              group_identifier: eduskuntaryhma.Tunnus ?? null,
              start_date: parseDate(jasenyys?.AlkuPvm)!,
              end_date: parseDate(jasenyys?.LoppuPvm),
            }))
          )
          .concat({
            person_id: representativeRow.person_id,
            group_identifier:
              data.XmlDataFi.Henkilo.Eduskuntaryhmat?.NykyinenEduskuntaryhma
                ?.Tunnus || null,
            start_date: parseDate(
              data.XmlDataFi.Henkilo.Eduskuntaryhmat?.NykyinenEduskuntaryhma
                ?.AlkuPvm
            )!,
            end_date: null,
          }),
        ["person_id"]
      );

    const parliamentGroupRows: ParliamentGroup[] = removeNullEntries(
      [
        ...[
          data.XmlDataFi.Henkilo.Eduskuntaryhmat.EdellisetEduskuntaryhmat
            ?.Eduskuntaryhma,
        ]
          .flat()
          .filter((s) => !!s)
          .map((eduskuntaryhma) => ({
            identifier: eduskuntaryhma.Tunnus,
            group_name: eduskuntaryhma.Nimi ?? eduskuntaryhma.Tunnus,
          })),
        {
          identifier:
            data.XmlDataFi.Henkilo.Eduskuntaryhmat.NykyinenEduskuntaryhma
              ?.Tunnus || null,
          group_name:
            data.XmlDataFi.Henkilo.Eduskuntaryhmat.NykyinenEduskuntaryhma
              ?.Nimi || null,
        },
      ].filter((g, ind, arr) => {
        if (ind === arr.findIndex((g1) => g1.identifier === g.identifier))
          return true;
        return false;
      })
    );

    // Mapping Committee Memberships
    const committeeMembershipRows: CommitteeMembership[] = removeNullEntries(
      [
        data.XmlDataFi.Henkilo.AiemmatToimielinjasenyydet?.Toimielin,
        data.XmlDataFi.Henkilo.NykyisetToimielinjasenyydet.Toimielin,
      ]
        .flat()
        .filter((s) => !!s)
        .flatMap((toimielin) =>
          [toimielin.Jasenyys].flat().map((jasenyys) => ({
            person_id: representativeRow.person_id,
            committee_identifier: toimielin.Tunnus,
            role: jasenyys?.Rooli ?? null,
            start_date: parseDate(jasenyys?.AlkuPvm),
            end_date: parseDate(jasenyys?.LoppuPvm),
          }))
        ),
      ["person_id"]
    );

    const committeeRows: Committee[] = removeNullEntries(
      [
        data.XmlDataFi.Henkilo.AiemmatToimielinjasenyydet?.Toimielin,
        data.XmlDataFi.Henkilo.NykyisetToimielinjasenyydet.Toimielin,
      ]
        .flat()
        .filter((s) => !!s)
        .map((toimielin) => ({
          committee_name: toimielin.Nimi ?? toimielin.Tunnus,
          identifier: toimielin.Tunnus,
        }))
        .filter((g, ind, arr) => {
          if (!g.identifier) return false;
          if (ind === arr.findIndex((g1) => g1.identifier === g.identifier))
            return true;
          return false;
        })
    );

    /*
    // Mapping Declarations
    const declarationRows: SQLModel.Declaration[] = data.XmlDataFi.Henkilo
      .Sidonnaisuudet.Sidonnaisuus
      ? [
          {
            person_id: representativeRow.person_id,
            declaration_type:
              data.XmlDataFi.Henkilo.Sidonnaisuudet.Sidonnaisuus.Otsikko ||
              null,
            description:
              data.XmlDataFi.Henkilo.Sidonnaisuudet.Sidonnaisuus.Sidonta ||
              null,
          },
        ]
      : [];
    */

    // Mapping Incomes
    const educationRows: Education[] = removeNullEntries(
      [data.XmlDataFi.Henkilo.Koulutukset.Koulutus].flat().map((koulutus) => ({
        person_id: representativeRow.person_id,
        name: koulutus.Nimi || null,
        establishement: koulutus.Oppilaitos || null,
        year: parseYear(koulutus.Vuosi),
      })),
      ["person_id"]
    );

    await sql`INSERT INTO representatives ${sql(
      representativeRow
    )} ON CONFLICT DO NOTHING`;
    if (electoralDistrictRows.length) {
      await sql`INSERT INTO electoral_districts ${sql(electoralDistrictRows)}`;
    }
    if (representativeTermRows.length) {
      await sql`INSERT INTO representative_terms ${sql(
        representativeTermRows
      )}`;
    }
    if (parliamentGroupRows.length) {
      await sql`INSERT INTO parliamentary_groups ${sql(
        parliamentGroupRows
      )} ON CONFLICT DO NOTHING`;
    }
    if (parliamentaryGroupMembershipRows.length) {
      await sql`INSERT INTO parliamentary_group_memberships ${sql(
        parliamentaryGroupMembershipRows
      )}`;
    }
    if (committeeRows.length) {
      await sql`INSERT INTO committees ${sql(
        committeeRows
      )} ON CONFLICT DO NOTHING`;
    }
    if (committeeMembershipRows.length) {
      await sql`INSERT INTO committee_memberships ${sql(
        committeeMembershipRows
      )}`;
    }
    /*
    await sql`INSERT INTO declarations ${sql(
      removeNullEntries(declarationRows, ["person_id"])
    )}`;
    */
    if (educationRows.length) {
      await sql`INSERT INTO educations ${sql(educationRows)}`;
    }
    if (process.env.DEBUG) console.log("Mapped", data.personId);
  };
