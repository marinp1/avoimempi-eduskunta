import type { Database } from "bun:sqlite";
import { insertRows, parseYear } from "../utils";

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
    const month = (() => {
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

const toEpochDay = (date: string): number => {
  return new Date(`${date}T00:00:00Z`).getTime();
};

const toIsoDate = (epochDay: number): string => {
  return new Date(epochDay).toISOString().slice(0, 10);
};

type DateInterval = {
  start_date: string;
  end_date: string | null;
};

const mergeContinuousIntervals = (intervals: DateInterval[]): DateInterval[] => {
  if (intervals.length === 0) return [];

  const sorted = [...intervals].sort((a, b) => {
    return toEpochDay(a.start_date) - toEpochDay(b.start_date);
  });

  const merged: DateInterval[] = [sorted[0]];

  for (const current of sorted.slice(1)) {
    const prev = merged[merged.length - 1];
    if (prev.end_date === null) continue;

    const prevEnd = toEpochDay(prev.end_date);
    const currentStart = toEpochDay(current.start_date);
    const mergesWithPrevious = currentStart <= prevEnd + 24 * 60 * 60 * 1000;

    if (!mergesWithPrevious) {
      merged.push(current);
      continue;
    }

    if (current.end_date === null) {
      prev.end_date = null;
      continue;
    }

    const currentEnd = toEpochDay(current.end_date);
    if (currentEnd > prevEnd) {
      prev.end_date = current.end_date;
    }
  }

  return merged;
};

const intersectTermRowsWithGroupMemberships = (
  termRows: DatabaseTables.Term[],
  groupMembershipRows: Array<{
    start_date: string;
    end_date: string | null;
  }>,
): DatabaseTables.Term[] => {
  if (termRows.length === 0 || groupMembershipRows.length === 0) {
    return termRows;
  }

  const refinedRows: DatabaseTables.Term[] = [];

  for (const term of termRows) {
    const termStart = toEpochDay(term.start_date);
    const termEnd = term.end_date ? toEpochDay(term.end_date) : Number.POSITIVE_INFINITY;

    const overlaps = groupMembershipRows.flatMap((group): DateInterval[] => {
      const groupStart = toEpochDay(group.start_date);
      const groupEnd = group.end_date
        ? toEpochDay(group.end_date)
        : Number.POSITIVE_INFINITY;
      const overlapStart = Math.max(termStart, groupStart);
      const overlapEnd = Math.min(termEnd, groupEnd);

      if (overlapStart > overlapEnd) {
        return [];
      }

      return [
        {
          start_date: toIsoDate(overlapStart),
          end_date:
            overlapEnd === Number.POSITIVE_INFINITY
              ? null
              : toIsoDate(overlapEnd),
        },
      ];
    });

    if (overlaps.length === 0) {
      // Keep original term if no group overlap exists to avoid dropping historical terms.
      refinedRows.push(term);
      continue;
    }

    const mergedOverlaps = mergeContinuousIntervals(overlaps);
    refinedRows.push(
      ...mergedOverlaps.map((interval) => {
        const startYear = parseYear(interval.start_date.substring(0, 4));
        const endYear = interval.end_date
          ? parseYear(interval.end_date.substring(0, 4))
          : null;
        return {
          person_id: term.person_id,
          start_date: interval.start_date,
          end_date: interval.end_date,
          start_year: startYear,
          end_year: endYear,
        };
      }),
    );
  }

  const deduped = new Map<string, DatabaseTables.Term>();
  for (const row of refinedRows) {
    const key = `${row.person_id}|${row.start_date}|${row.end_date ?? ""}`;
    if (!deduped.has(key)) {
      deduped.set(key, row);
    }
  }

  return [...deduped.values()].sort((a, b) => {
    return toEpochDay(a.start_date) - toEpochDay(b.start_date);
  });
};

export default (db: Database) =>
  (dataToImport: DataModel.Representative) => {
    const XmlDataFi = JSON.parse(dataToImport.XmlDataFi);

    if (process.env.DEBUG)
      console.log("Mapping", dataToImport.lastname, dataToImport.personId);

    type RepresentativeInsert = Omit<
      DatabaseTables.Representative,
      "birth_year"
    >;
    const representativeRow: RepresentativeInsert = {
      person_id: Number(dataToImport.personId),
      first_name: dataToImport.firstname,
      last_name: dataToImport.lastname,
      sort_name: XmlDataFi.Henkilo.LajitteluNimi,
      marticle_name: XmlDataFi.Henkilo.MatrikkeliNimi,
      email: XmlDataFi.Henkilo.SahkoPosti ?? null,
      birth_date: parseDate(XmlDataFi.Henkilo.SyntymaPvm)!,
      birth_place: XmlDataFi.Henkilo.SyntymaPaikka,
      death_date: parseDate(XmlDataFi.Henkilo.KuolemaPvm),
      death_place: XmlDataFi.Henkilo.KuolemaPaikka ?? null,
      gender: XmlDataFi.Henkilo.SukuPuoliKoodi,
      current_municipality: XmlDataFi.Henkilo.NykyinenKotikunta ?? null,
      profession: XmlDataFi.Henkilo.Ammatti,
      party: dataToImport.party,
      minister: dataToImport.minister !== "f",
      phone: XmlDataFi.Henkilo.Puh ?? null,
      website: XmlDataFi.Henkilo.KotiSivu ?? null,
      additional_info: XmlDataFi.Henkilo.LisaTiedot || "",
      term_end_date: parseDate(XmlDataFi.Henkilo.KansanedustajuusPaattynytPvm),
    };

    const districtRows: DatabaseTables.District[] = [];
    const electoralDistrictRows: DatabaseTables.RepresentativeDistrict[] =
      mergeArrays(
        XmlDataFi.Henkilo.Vaalipiirit.EdellisetVaalipiirit?.VaaliPiiri,
        XmlDataFi.Henkilo.Vaalipiirit.NykyinenVaalipiiri,
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

    type ParsedAbsence = {
      absenceRows: DatabaseTables.TemporaryAbsence[];
      joiningRows: DatabaseTables.PeopleJoiningParliament[];
      leavingRows: DatabaseTables.PeopleLeavingParliament[];
    };

    const { absenceRows, joiningRows, leavingRows }: ParsedAbsence =
      mergeArrays(
        XmlDataFi.Henkilo.EdustajatoimiKeskeytynyt?.ToimenKeskeytys,
        XmlDataFi.Henkilo.Kansanedustajana?.Keskeytys,
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
                ] satisfies DatabaseTables.PeopleLeavingParliament[],
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
                    start_date: cur.start_date,
                  },
                ] satisfies DatabaseTables.PeopleJoiningParliament[],
              };
            }
            return {
              ...prev,
              absenceRows: [
                ...prev.absenceRows,
                cur,
              ] satisfies DatabaseTables.TemporaryAbsence[],
            };
          },
          {
            absenceRows: [],
            joiningRows: [],
            leavingRows: [],
          },
        );

    const trustPositionRows: DatabaseTables.TrustPosition[] = [
      ...mergeArrays(
        XmlDataFi.Henkilo.ValtiollisetLuottamustehtavat?.Tehtava,
      ).map((s) => ({ ...s, type: "national" as const })),
      ...mergeArrays(
        XmlDataFi.Henkilo.KunnallisetLuottamustehtavat?.Tehtava,
      ).map((s) => ({ ...s, type: "municapility" as const })),
      ...mergeArrays(XmlDataFi.Henkilo.MuutLuottamustehtavat?.Tehtava).map(
        (s) => ({ ...s, type: "other" as const }),
      ),
      ...mergeArrays(
        XmlDataFi.Henkilo.KansanvalisetLuottamustehtavat?.Tehtava,
      ).map((s) => ({ ...s, type: "international" as const })),
    ].map((v) => ({
      person_id: +dataToImport.personId,
      name: v.Nimi,
      period: v.AikaJakso,
      position_type: v.type,
    }));

    let unknownCommitteeInd = 0;
    const committeeRows: DatabaseTables.Committee[] = [];
    const committeeMembershipRows: DatabaseTables.CommitteeMembership[] = [
      ...mergeArrays(
        XmlDataFi.Henkilo.NykyisetToimielinjasenyydet?.Toimielin,
        XmlDataFi.Henkilo.AiemmatToimielinjasenyydet?.Toimielin,
      ).flatMap((s) =>
        mergeArrays(s.Jasenyys).map((j) => ({ ...j, __parent__: s })),
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
    const parliamentGroupRows: DatabaseTables.ParliamentGroup[] = [];
    const addParliamentGroupRow = (data: DatabaseTables.ParliamentGroup) => {
      const group_code =
        data.code || `unknown${String(unknownGroupCode++).padStart(5, "0")}`;
      if (!parliamentGroupRows.find((r) => r.code === group_code)) {
        parliamentGroupRows.push({
          code: group_code,
        });
      }
      return group_code;
    };
    type ParliamentGroupMembershipInsert = Omit<
      DatabaseTables.ParliamentGroupMembership,
      "group_abbreviation"
    >;
    const parliamentGroupMembershipRows: ParliamentGroupMembershipInsert[] = [
      ...mergeArrays(
        XmlDataFi.Henkilo.Eduskuntaryhmat.EdellisetEduskuntaryhmat
          ?.Eduskuntaryhma,
      ).flatMap((s) =>
        mergeArrays(s.Jasenyys).map((j) => ({
          ...j,
          __parent__: s,
        })),
      ),
      ...mergeArrays(
        XmlDataFi.Henkilo.Eduskuntaryhmat.NykyinenEduskuntaryhma,
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

    const termRowsRaw: DatabaseTables.Term[] = mergeArrays(
      XmlDataFi.Henkilo.Edustajatoimet.Edustajatoimi,
    ).map((v) => {
      const startDate = parseDate(v.AlkuPvm);
      const endDate = parseDate(v.LoppuPvm);
      return {
        person_id: +dataToImport.personId,
        start_date: startDate!,
        end_date: endDate,
        start_year: startDate ? parseYear(startDate.substring(0, 4)) : null,
        end_year: endDate ? parseYear(endDate.substring(0, 4)) : null,
      };
    });

    const termRows: DatabaseTables.Term[] = intersectTermRowsWithGroupMemberships(
      termRowsRaw,
      parliamentGroupMembershipRows,
    );

    const parliamentGroupAssignmentRows: DatabaseTables.ParliamentGroupAssignment[] =
      [
        ...mergeArrays(
          XmlDataFi.Henkilo.Eduskuntaryhmat.TehtavatAiemmissaEduskuntaryhmissa
            ?.Eduskuntaryhma,
          XmlDataFi.Henkilo.Eduskuntaryhmat.TehtavatEduskuntaryhmassa
            ?.Eduskuntaryhma,
        ),
      ]
        .flatMap((s) =>
          mergeArrays(s.Tehtava).map((t) => ({
            ...t,
            __parent__: s,
          })),
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

    const governmentMembershipRows: DatabaseTables.GovernmentMembership[] =
      mergeArrays(XmlDataFi.Henkilo.ValtioneuvostonJasenyydet?.Jasenyys).map(
        (v) => ({
          person_id: +dataToImport.personId,
          name: v.Nimi,
          ministry: v.Ministeriys,
          government: v.Hallitus,
          start_date: parseDate(v.AlkuPvm)!,
          end_date: parseDate(v.LoppuPvm),
        }),
      );

    const workRows: DatabaseTables.WorkExperience[] = mergeArrays(
      XmlDataFi.Henkilo.TyoUra?.Tyo,
    ).map((v) => ({
      person_id: +dataToImport.personId,
      position: v.Nimi,
      period: v.AikaJakso,
    }));

    const educationRows: DatabaseTables.Education[] = mergeArrays(
      XmlDataFi.Henkilo.Koulutukset?.Koulutus,
    ).map((v) => ({
      person_id: +dataToImport.personId,
      name: v.Nimi,
      institution: v.Oppilaitos,
      year: parseYear(v.Vuosi),
    }));

    // TODO: Publications
    const _publicationRows: DatabaseTables.Publication[] = [];

    const insert = insertRows(db);

    insert(DatabaseTables.Representative, [representativeRow]);
    insert(DatabaseTables.District, districtRows);
    insert(DatabaseTables.RepresentativeDistrict, electoralDistrictRows);
    insert(DatabaseTables.Term, termRows);
    insert(DatabaseTables.TemporaryAbsence, absenceRows);
    insert(DatabaseTables.PeopleLeavingParliament, leavingRows);
    insert(DatabaseTables.PeopleJoiningParliament, joiningRows);
    insert(DatabaseTables.TrustPosition, trustPositionRows);
    insert(DatabaseTables.Committee, committeeRows);
    insert(DatabaseTables.CommitteeMembership, committeeMembershipRows);
    insert(DatabaseTables.ParliamentaryGroup, parliamentGroupRows);
    insert(
      DatabaseTables.ParliamentaryGroupMembership,
      parliamentGroupMembershipRows,
    );
    insert(
      DatabaseTables.ParliamentaryGroupAssignment,
      parliamentGroupAssignmentRows,
    );
    insert(DatabaseTables.GovernmentMembership, governmentMembershipRows);
    insert(DatabaseTables.WorkHistory, workRows);
    insert(DatabaseTables.Education, educationRows);

    // await insertRows(DatabaseTables.Publication, publicationRows); TODO: NOT IMPLEMENTED YET

    if (process.env.DEBUG) console.log("Mapped", dataToImport.personId);
  };
