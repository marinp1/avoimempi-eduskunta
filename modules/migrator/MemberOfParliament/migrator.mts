import { SQL, type TransactionSQL } from "bun";
import type { DataModel } from "./DataModel.mts";
import type { SQLModel } from "./SQLModel.mts";

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

const DatabaseTables = Object.freeze({
  Representative: "Representative",
  Education: "Education",
  WorkHistory: "WorkHistory",
  Committee: "Committee",
  CommitteeMembership: "CommitteeMembership",
  TrustPosition: "TrustPosition",
  GovernmentMembership: "GovernmentMembership",
  Publications: "Publications",
  ParliamentaryGroup: "ParliamentaryGroup",
  ParliamentaryGroupMembership: "ParliamentaryGroupMembership",
  District: "District",
  RepresentativeDistrict: "RepresentativeDistrict",
  Term: "Term",
  PeopleLeavingParliament: "PeopleLeavingParliament",
  PeopleJoiningParliament: "PeopleJoiningParliament",
  TemporaryAbsence: "TemporaryAbsence",
  ParliamentaryGroupAssignment: "ParliamentaryGroupAssignment",
});

const mergeArrays = <T>(
  ...values: Array<T | Array<T>>
): Exclude<T, undefined>[] => {
  return values
    .flatMap((v) => (Array.isArray(v) ? v : [v]))
    .filter((s) => !!s) as Exclude<T, undefined>[];
};

export default (sql: TransactionSQL) =>
  async (dataToImport: DataModel.Representative) => {
    if (process.env.DEBUG)
      console.log("Mapping", dataToImport.lastname, dataToImport.personId);

    const representativeRow: SQLModel.Representative = {
      person_id: Number(dataToImport.personId),
      first_name: dataToImport.firstname,
      last_name: dataToImport.lastname,
      sort_name: dataToImport.XmlDataFi.Henkilo.LajitteluNimi,
      marticle_name: dataToImport.XmlDataFi.Henkilo.MatrikkeliNimi,
      email: dataToImport.XmlDataFi.Henkilo.SahkoPosti ?? null,
      birth_date: parseDate(dataToImport.XmlDataFi.Henkilo.SyntymaPvm)!,
      birth_place: dataToImport.XmlDataFi.Henkilo.SyntymaPaikka,
      death_date: parseDate(dataToImport.XmlDataFi.Henkilo.KuolemaPvm),
      death_place: dataToImport.XmlDataFi.Henkilo.KuolemaPaikka ?? null,
      gender: dataToImport.XmlDataFi.Henkilo.SukuPuoliKoodi,
      current_municipality:
        dataToImport.XmlDataFi.Henkilo.NykyinenKotikunta ?? null,
      profession: dataToImport.XmlDataFi.Henkilo.Ammatti,
      party: dataToImport.party,
      minister: dataToImport.minister !== "f",
      phone: dataToImport.XmlDataFi.Henkilo.Puh ?? null,
      website: dataToImport.XmlDataFi.Henkilo.KotiSivu ?? null,
      additional_info: dataToImport.XmlDataFi.Henkilo.LisaTiedot || "",
      term_end_date: parseDate(
        dataToImport.XmlDataFi.Henkilo.KansanedustajuusPaattynytPvm
      ),
    };

    const districtRows: SQLModel.District[] = [];
    const electoralDistrictRows: SQLModel.RepresentativeDistrict[] =
      mergeArrays(
        dataToImport.XmlDataFi.Henkilo.Vaalipiirit.EdellisetVaalipiirit
          ?.VaaliPiiri,
        dataToImport.XmlDataFi.Henkilo.Vaalipiirit.NykyinenVaalipiiri
      ).map((v) => {
        if (!districtRows.find((r) => r.code === v.Tunnus)) {
          districtRows.push({ code: v.Tunnus, name: v.Nimi || v.Tunnus });
        }
        return {
          person_id: +dataToImport.personId,
          district_code: v.Tunnus,
          start_date: parseDate(v.AlkuPvm)!,
          end_date: parseDate(v.LoppuPvm),
        };
      });

    const termRows: SQLModel.Term[] = mergeArrays(
      dataToImport.XmlDataFi.Henkilo.Edustajatoimet.Edustajatoimi
    ).map((v) => ({
      person_id: +dataToImport.personId,
      start_date: parseDate(v.AlkuPvm)!,
      end_date: parseDate(v.LoppuPvm),
    }));

    type ParsedAbsence = {
      absenceRows: SQLModel.TemporaryAbsence[];
      joiningRows: SQLModel.JoiningParliament[];
      leavingRows: SQLModel.LeavingParliament[];
    };

    const { absenceRows, joiningRows, leavingRows }: ParsedAbsence =
      mergeArrays(
        dataToImport.XmlDataFi.Henkilo.EdustajatoimiKeskeytynyt
          ?.ToimenKeskeytys,
        dataToImport.XmlDataFi.Henkilo.Kansanedustajana?.Keskeytys
      )
        .map((v) => ({
          person_id: +dataToImport.personId,
          start_date: parseDate(v.AlkuPvm)!,
          end_date: parseDate(v.LoppuPvm),
          description: v.Selite,
          replacement_person:
            [v.TilallaSelite ?? null, v.TilallaHenkilo ?? null]
              .filter((s) => s)
              .join(" ") || null,
        }))
        .reduce<ParsedAbsence>(
          (prev, cur) => {
            if (cur.replacement_person?.startsWith("Seuraaja ")) {
              return {
                ...prev,
                leavingRows: [
                  ...prev.leavingRows,
                  {
                    person_id: +dataToImport.personId,
                    description: cur.description,
                    replacement_person: cur.replacement_person,
                    end_date: cur.end_date,
                  },
                ] satisfies SQLModel.LeavingParliament[],
              };
            }
            if (cur.replacement_person?.startsWith("Edeltäjä ")) {
              return {
                ...prev,
                joiningRows: [
                  ...prev.joiningRows,
                  {
                    person_id: +dataToImport.personId,
                    description: cur.description,
                    replacement_person: cur.replacement_person,
                    start_date: cur.end_date,
                  },
                ] satisfies SQLModel.JoiningParliament[],
              };
            }
            return {
              ...prev,
              absenceRows: [
                ...prev.absenceRows,
                cur,
              ] satisfies SQLModel.LeavingParliament[],
            };
          },
          {
            absenceRows: [],
            joiningRows: [],
            leavingRows: [],
          }
        );

    const trustPositionRows: SQLModel.TrustPosition[] = [
      ...mergeArrays(
        dataToImport.XmlDataFi.Henkilo.ValtiollisetLuottamustehtavat?.Tehtava
      ).map((s) => ({ ...s, type: "national" as const })),
      ...mergeArrays(
        dataToImport.XmlDataFi.Henkilo.KunnallisetLuottamustehtavat?.Tehtava
      ).map((s) => ({ ...s, type: "municapility" as const })),
      ...mergeArrays(
        dataToImport.XmlDataFi.Henkilo.MuutLuottamustehtavat?.Tehtava
      ).map((s) => ({ ...s, type: "other" as const })),
      ...mergeArrays(
        dataToImport.XmlDataFi.Henkilo.KansanvalisetLuottamustehtavat?.Tehtava
      ).map((s) => ({ ...s, type: "international" as const })),
    ].map((v) => ({
      person_id: +dataToImport.personId,
      name: v.Nimi,
      period: v.AikaJakso,
      position_type: v.type,
    }));

    let unknownCommitteeInd = 0;
    const committeeRows: SQLModel.Committee[] = [];
    const committeeMembershipRows: SQLModel.CommitteeMembership[] = [
      ...mergeArrays(
        dataToImport.XmlDataFi.Henkilo.NykyisetToimielinjasenyydet?.Toimielin,
        dataToImport.XmlDataFi.Henkilo.AiemmatToimielinjasenyydet?.Toimielin
      ).flatMap((s) =>
        mergeArrays(s.Jasenyys).map((j) => ({ ...j, __parent__: s }))
      ),
    ].map((v) => {
      const committee_code =
        v.__parent__.Tunnus ||
        `unknown${String(unknownCommitteeInd++).padStart(5, "0")}`;
      if (!committeeRows.find((r) => r.code === committee_code)) {
        committeeRows.push({
          code: committee_code,
          name: v.__parent__.Nimi ?? committee_code,
        });
      }
      return {
        person_id: +dataToImport.personId,
        committee_code: committee_code,
        role: v.Rooli,
        start_date: parseDate(v.AlkuPvm)!,
        end_date: parseDate(v.LoppuPvm),
      };
    });

    let unknownGroupCode = 0;
    const parliamentGroupRows: SQLModel.ParliamentGroup[] = [];
    const addParliamentGroupRow = (data: SQLModel.ParliamentGroup) => {
      const group_code =
        data.code || `unknown${String(unknownGroupCode++).padStart(5, "0")}`;
      if (!parliamentGroupRows.find((r) => r.code === group_code)) {
        parliamentGroupRows.push({
          code: group_code,
        });
      }
      return group_code;
    };
    const parliamentGroupMembershipRows: SQLModel.ParliamentGroupMembership[] =
      [
        ...mergeArrays(
          dataToImport.XmlDataFi.Henkilo.Eduskuntaryhmat
            .EdellisetEduskuntaryhmat?.Eduskuntaryhma
        ).flatMap((s) =>
          mergeArrays(s.Jasenyys).map((j) => ({
            ...j,
            __parent__: s,
          }))
        ),
        ...mergeArrays(
          dataToImport.XmlDataFi.Henkilo.Eduskuntaryhmat.NykyinenEduskuntaryhma
        ).map((s) => ({
          ...s,
          LoppuPvm: null,
          __parent__: s,
        })),
      ].map((v) => {
        const groupCode = addParliamentGroupRow({
          code: v.__parent__.Tunnus,
        });
        return {
          person_id: +dataToImport.personId,
          group_code: groupCode,
          group_name: v.__parent__.Nimi,
          start_date: parseDate(v.AlkuPvm)!,
          end_date: parseDate(v.LoppuPvm),
        };
      });

    const parliamentGroupAssignmentRows: SQLModel.ParliamentGroupAssignment[] =
      [
        ...mergeArrays(
          dataToImport.XmlDataFi.Henkilo.Eduskuntaryhmat
            .TehtavatAiemmissaEduskuntaryhmissa?.Eduskuntaryhma,
          dataToImport.XmlDataFi.Henkilo.Eduskuntaryhmat
            .TehtavatEduskuntaryhmassa?.Eduskuntaryhma
        ),
      ]
        .flatMap((s) =>
          mergeArrays(s.Tehtava).map((t) => ({
            ...t,
            __parent__: s,
          }))
        )
        .map((v) => {
          const groupCode = addParliamentGroupRow({
            code: v.__parent__.Tunnus,
          });
          return {
            person_id: +dataToImport.personId,
            group_code: groupCode,
            group_name: v.__parent__.Nimi,
            role: v.Rooli,
            start_date: parseDate(v.AlkuPvm)!,
            end_date: parseDate(v.LoppuPvm),
            time_period: v.AikaJakso || null,
          };
        });

    const governmentMembershipRows: SQLModel.GovernmentMembership[] =
      mergeArrays(
        dataToImport.XmlDataFi.Henkilo.ValtioneuvostonJasenyydet?.Jasenyys
      ).map((v) => ({
        person_id: +dataToImport.personId,
        name: v.Nimi,
        ministry: v.Ministeriys,
        government: v.Hallitus,
        start_date: parseDate(v.AlkuPvm)!,
        end_date: parseDate(v.LoppuPvm),
      }));

    const workRows: SQLModel.WorkExperience[] = mergeArrays(
      dataToImport.XmlDataFi.Henkilo.TyoUra?.Tyo
    ).map((v) => ({
      person_id: +dataToImport.personId,
      position: v.Nimi,
      period: v.AikaJakso,
    }));

    const educationRows: SQLModel.Education[] = mergeArrays(
      dataToImport.XmlDataFi.Henkilo.Koulutukset?.Koulutus
    ).map((v) => ({
      person_id: +dataToImport.personId,
      name: v.Nimi,
      institution: v.Oppilaitos,
      year: parseYear(v.Vuosi),
    }));

    // TODO: Publications
    const publicationRows: SQLModel.Publication[] = [];

    const insertRows = async (table: string, rows: any[]) => {
      if (rows.length) {
        await sql`INSERT INTO ${sql.unsafe(table)} ${sql(
          rows
        )} ON CONFLICT DO NOTHING`;
      }
    };

    await insertRows(DatabaseTables.Representative, [representativeRow]);
    await insertRows(DatabaseTables.District, districtRows);
    await insertRows(
      DatabaseTables.RepresentativeDistrict,
      electoralDistrictRows
    );
    await insertRows(DatabaseTables.Term, termRows);
    await insertRows(DatabaseTables.TemporaryAbsence, absenceRows);
    await insertRows(DatabaseTables.PeopleLeavingParliament, leavingRows);
    await insertRows(DatabaseTables.PeopleJoiningParliament, joiningRows);
    await insertRows(DatabaseTables.TrustPosition, trustPositionRows);
    await insertRows(DatabaseTables.Committee, committeeRows);
    await insertRows(
      DatabaseTables.CommitteeMembership,
      committeeMembershipRows
    );
    await insertRows(DatabaseTables.ParliamentaryGroup, parliamentGroupRows);
    await insertRows(
      DatabaseTables.ParliamentaryGroupMembership,
      parliamentGroupMembershipRows
    );
    await insertRows(
      DatabaseTables.ParliamentaryGroupAssignment,
      parliamentGroupAssignmentRows
    );
    await insertRows(
      DatabaseTables.GovernmentMembership,
      governmentMembershipRows
    );
    await insertRows(DatabaseTables.WorkHistory, workRows);
    await insertRows(DatabaseTables.Education, educationRows);

    // await insertRows(DatabaseTables.Publication, publicationRows); TODO: NOT IMPLEMENTED YET

    if (process.env.DEBUG) console.log("Mapped", dataToImport.personId);
  };
