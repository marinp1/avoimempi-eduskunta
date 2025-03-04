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
  Interruption: "Interruption",
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

    const interruptionRows: SQLModel.Interruption[] = mergeArrays(
      dataToImport.XmlDataFi.Henkilo.EdustajatoimiKeskeytynyt?.ToimenKeskeytys
    ).map((v) => ({
      person_id: +dataToImport.personId,
      start_date: parseDate(v.AlkuPvm)!,
      end_date: parseDate(v.LoppuPvm),
      description: v.Selite,
      replacement_person:
        [v.TilallaSelite ?? null, v.TilallaHenkilo ?? null]
          .filter((s) => s)
          .join(" ") || null,
    }));

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
          name: data.name ?? group_code,
        });
      }
      return group_code;
    };
    const parliamentGroupMembershipRows: SQLModel.ParliamentGroupMembership[] =
      [
        ...mergeArrays(
          dataToImport.XmlDataFi.Henkilo.Eduskuntaryhmat
            .EdellisetEduskuntaryhmat?.Eduskuntaryhma,
          dataToImport.XmlDataFi.Henkilo.Eduskuntaryhmat.NykyinenEduskuntaryhma
        ).flatMap((s) =>
          mergeArrays(s.Jasenyys).map((j) => ({
            ...j,
            __parent__: s,
          }))
        ),
      ].map((v) => {
        const groupCode = addParliamentGroupRow({
          code: v.__parent__.Tunnus,
          name: v.__parent__.Nimi,
        });
        return {
          person_id: +dataToImport.personId,
          group_code: groupCode,
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
            name: v.__parent__.Nimi,
          });
          return {
            person_id: +dataToImport.personId,
            group_code: groupCode,
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

    await sql`INSERT INTO Representative ${sql(
      representativeRow
    )} ON CONFLICT DO NOTHING`;

    if (districtRows.length) {
      await sql`INSERT INTO District ${sql(
        districtRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (electoralDistrictRows.length) {
      await sql`INSERT INTO RepresentativeDistrict ${sql(
        electoralDistrictRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (termRows.length) {
      await sql`INSERT INTO Term ${sql(termRows)} ON CONFLICT DO NOTHING`;
    }

    if (interruptionRows.length) {
      await sql`INSERT INTO Interruption ${sql(
        interruptionRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (trustPositionRows.length) {
      await sql`INSERT INTO TrustPosition ${sql(
        trustPositionRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (committeeRows.length) {
      await sql`INSERT INTO Committee ${sql(
        committeeRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (committeeMembershipRows.length) {
      await sql`INSERT INTO CommitteeMembership ${sql(
        committeeMembershipRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (parliamentGroupRows.length) {
      await sql`INSERT INTO ParliamentaryGroup ${sql(
        parliamentGroupRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (parliamentGroupMembershipRows.length) {
      await sql`INSERT INTO ParliamentaryGroupMembership ${sql(
        parliamentGroupMembershipRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (parliamentGroupAssignmentRows.length) {
      await sql`INSERT INTO ParliamentaryGroupAssignment ${sql(
        parliamentGroupAssignmentRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (governmentMembershipRows.length) {
      await sql`INSERT INTO GovernmentMembership ${sql(
        governmentMembershipRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (workRows.length) {
      await sql`INSERT INTO WorkHistory ${sql(
        workRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (educationRows.length) {
      await sql`INSERT INTO Education ${sql(
        educationRows
      )} ON CONFLICT DO NOTHING`;
    }

    if (process.env.DEBUG) console.log("Mapped", dataToImport.personId);
  };
