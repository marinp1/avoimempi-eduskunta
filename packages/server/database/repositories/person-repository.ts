import type { Database } from "bun:sqlite";
import governmentMemberships from "../queries/GOVERNMENT_MEMBERSHIPS.sql";
import leavingParliamentRecords from "../queries/LEAVING_PARLIAMENT.sql";
import personCommittees from "../queries/PERSON_COMMITTEES.sql";
import personDissents from "../queries/PERSON_DISSENTS.sql";
import personFocusAreasRaw from "../queries/PERSON_FOCUS_AREAS_RAW.sql";
import personInitiatives from "../queries/PERSON_INITIATIVES.sql";
import personMetricAggregates from "../queries/PERSON_METRIC_AGGREGATES.sql";
import personGovernmentPeriods from "../queries/PERSON_GOVERNMENT_PERIODS.sql";
import personGroupMemberships from "../queries/PERSON_GROUP_MEMBERSHIPS.sql";
import personQuestions from "../queries/PERSON_QUESTIONS.sql";
import personSearch from "../queries/PERSON_SEARCH.sql";
import personSpeeches from "../queries/PERSON_SPEECHES.sql";
import personSpeechesCount from "../queries/PERSON_SPEECHES_COUNT.sql";
import personTerms from "../queries/PERSON_TERMS.sql";
import representativeDetails from "../queries/REPRESENTATIVE_DETAILS.sql";
import representativeDistricts from "../queries/REPRESENTATIVE_DISTRICTS.sql";
import representativesPaginated from "../queries/REPRESENTATIVES_PAGINATED.sql";
import trustPositions from "../queries/TRUST_POSITIONS.sql";
import votesByPerson from "../queries/VOTES_BY_PERSON.sql";
import { buildSearchQuery } from "../query-helpers";

export class PersonRepository {
  constructor(private readonly db: Database) {}

  public fetchRepresentativePage(params: { page: number; limit: number }) {
    const offset = (params.page - 1) * params.limit;
    const stmt = this.db.prepare<
      DatabaseTables.Representative,
      {
        $limit: number;
        $offset: number;
      }
    >(representativesPaginated);
    const data = stmt.all({ $limit: params.limit, $offset: offset });
    stmt.finalize();
    return data;
  }

  public fetchPersonSearch(params: {
    q: string;
    limit?: number;
    date?: string | null;
  }) {
    const searchQuery = buildSearchQuery(params.q);
    if (!searchQuery) return [];
    const exactQuery = params.q.trim().replace(/\s+/g, " ");
    const stmt = this.db.prepare<
      DatabaseQueries.PersonSearchResult,
      {
        $query: string;
        $exactQuery: string;
        $prefixQuery: string;
        $limit: number;
        $date: string | null;
      }
    >(personSearch);
    const data = stmt.all({
      $query: searchQuery,
      $exactQuery: exactQuery,
      $prefixQuery: `${exactQuery}%`,
      $limit: params.limit ?? 20,
      $date: params.date ?? null,
    });
    stmt.finalize();
    return data;
  }

  public fetchPersonGroupMemberships(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.ParliamentGroupMembership,
      { $personId: number }
    >(personGroupMemberships);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchPersonTerms(params: { id: string }) {
    const stmt = this.db.prepare<DatabaseTables.Term, { $personId: number }>(
      personTerms,
    );
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchPersonVotes(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseQueries.VotesByPerson,
      { $personId: number }
    >(votesByPerson);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchRepresentativeDetails(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.Representative,
      { $personId: number }
    >(representativeDetails);
    const data = stmt.get({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchRepresentativeDistricts(params: { id: string }) {
    const stmt = this.db.prepare<
      {
        id: number;
        person_id: number;
        district_name: string;
        start_date: string;
        end_date: string;
      },
      { $personId: number }
    >(representativeDistricts);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchLeavingParliamentRecords(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.PeopleLeavingParliament,
      { $personId: number }
    >(leavingParliamentRecords);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchTrustPositions(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.TrustPosition,
      { $personId: number }
    >(trustPositions);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchGovernmentMemberships(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.GovernmentMembership,
      { $personId: number }
    >(governmentMemberships);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchGovernmentPeriods(params: { id: string }) {
    const stmt = this.db.prepare<
      {
        government_name: string;
        government_start_date: string;
        government_end_date: string | null;
        is_coalition: 0 | 1;
      },
      { $personId: number }
    >(personGovernmentPeriods);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchPersonSpeeches(params: {
    personId: string;
    limit?: number;
    offset?: number;
  }) {
    const stmt = this.db.prepare<
      {
        id: number;
        section_key: string;
        session_key: string;
        section_title: string | null;
        section_identifier: string | null;
        start_time: string | null;
        end_time: string | null;
        speech_type: string | null;
        processing_phase: string | null;
        document: string | null;
        content: string | null;
        party: string | null;
        minutes_url: string | null;
        word_count: number;
      },
      { $personId: number; $limit: number; $offset: number }
    >(personSpeeches);
    const data = stmt.all({
      $personId: +params.personId,
      $limit: params.limit ?? 50,
      $offset: params.offset ?? 0,
    });
    stmt.finalize();
    const countStmt = this.db.prepare<{ total: number }, { $personId: number }>(
      personSpeechesCount,
    );
    const { total } = countStmt.get({ $personId: +params.personId })!;
    countStmt.finalize();
    return { speeches: data, total };
  }

  public fetchPersonQuestions(params: { personId: string; limit?: number }) {
    const stmt = this.db.prepare<
      {
        question_kind: "interpellation" | "written_question" | "oral_question";
        id: number;
        parliament_identifier: string;
        title: string | null;
        submission_date: string | null;
        relation_role: "asker" | "first_signer" | "signer";
      },
      { $personId: number; $limit: number }
    >(personQuestions);
    const data = stmt.all({
      $personId: +params.personId,
      $limit: params.limit ?? 500,
    });
    stmt.finalize();
    return data;
  }

  public fetchPersonCommittees(params: { personId: string }) {
    const stmt = this.db.prepare<
      {
        id: number;
        committee_code: string;
        committee_name: string;
        role: string;
        start_date: string;
        end_date: string | null;
      },
      { $personId: number }
    >(personCommittees);
    const data = stmt.all({ $personId: +params.personId });
    stmt.finalize();
    return data;
  }

  public fetchPersonInitiatives(params: { personId: string; limit?: number }) {
    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        initiative_type_code: string;
        title: string | null;
        submission_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        relation_role: "first_signer" | "co_signer";
        is_first_signer: 0 | 1;
        subjects: string | null;
      },
      { $personId: number; $limit: number }
    >(personInitiatives);
    const rows = stmt.all({
      $personId: +params.personId,
      $limit: params.limit ?? 200,
    });
    stmt.finalize();
    return rows.map((r) => ({
      ...r,
      subjects: r.subjects ? r.subjects.split("||").filter(Boolean) : [],
    }));
  }

  public fetchPersonInterpellations(params: { personId: string }) {
    const all = this.fetchPersonQuestions({
      personId: params.personId,
      limit: 1_000,
    });
    return all.filter((q) => q.question_kind === "interpellation");
  }

  public fetchPersonTies(params: { personId: string }) {
    const trustPositions = this.fetchTrustPositions({ id: params.personId });
    const today = new Date().toISOString().slice(0, 10);
    const isActive = (period: string | null | undefined) => {
      if (!period) return true;
      const trimmed = String(period).trim();
      if (!trimmed) return true;
      // period strings are heterogenous; treat as active when no end year present
      // or when an end year >= current year is found.
      const years = trimmed.match(/\d{4}/g);
      if (!years || years.length === 0) return true;
      const last = +years[years.length - 1]!;
      return last >= new Date().getFullYear();
    };
    return {
      activeTrustPositions: trustPositions.filter((tp) =>
        isActive((tp as { period?: string | null }).period),
      ),
      allTrustPositions: trustPositions,
      generatedAt: today,
    };
  }

  public fetchPersonFocusAreas(params: { personId: string; topN?: number }) {
    const stmt = this.db.prepare<
      {
        source: string;
        label: string;
        weight: number;
      },
      { $personId: number }
    >(personFocusAreasRaw);
    const rows = stmt.all({ $personId: +params.personId });
    stmt.finalize();

    // Aggregate by normalized label across sources, ranking by combined weight.
    const aggregated = new Map<
      string,
      { label: string; weight: number; sourceWeights: Record<string, number> }
    >();
    for (const row of rows) {
      if (!row.label) continue;
      const key = row.label.toLowerCase().trim();
      if (!key) continue;
      const existing = aggregated.get(key);
      if (existing) {
        existing.weight += row.weight;
        existing.sourceWeights[row.source] =
          (existing.sourceWeights[row.source] ?? 0) + row.weight;
      } else {
        aggregated.set(key, {
          label: row.label,
          weight: row.weight,
          sourceWeights: { [row.source]: row.weight },
        });
      }
    }
    const ranked = Array.from(aggregated.values())
      .map((entry) => ({
        label: entry.label,
        weight: entry.weight,
        sources: Object.keys(entry.sourceWeights).sort(),
        sourceWeights: entry.sourceWeights,
      }))
      .sort((a, b) => b.weight - a.weight);

    return {
      areas: ranked.slice(0, params.topN ?? 12),
      methodology:
        "Painopisteet on koottu yhdistämällä valiokuntajäsenyydet, allekirjoitettujen aloitteiden, välikysymysten ja kirjallisten kysymysten aiheet sekä puheenvuorojen istuntokohdat. Painokerroin on raakojen esiintymien summa. AI-pohjainen aiheluokitus tarkentaa listaa myöhemmin.",
    };
  }

  public fetchPersonElectionContext(_params: { personId: string }) {
    // Schema for Election / Candidacy is sketched but not yet ingested.
    // Returning null is the documented contract for v1; the UI renders an empty strip.
    return null;
  }

  public fetchPersonCapabilities(params: { personId: string }) {
    const personId = +params.personId;
    if (!Number.isFinite(personId) || personId <= 0) {
      return {
        personId: 0,
        hasVaalikone: false,
        hasAiSummary: false,
        hasSentiment: false,
        hasTopicTags: false,
        hasElectionContext: false,
      };
    }
    return {
      personId,
      hasVaalikone: false,
      hasAiSummary: false,
      hasSentiment: false,
      hasTopicTags: false,
      hasElectionContext: false,
    };
  }

  public fetchPersonAnnotations(_params: {
    personId: string;
    kind?: string | null;
  }) {
    // Annotation tables (EntityAnnotation) are sketched in the plan but not migrated yet.
    // Returns empty array; defines the response contract.
    return [] as Array<{
      kind: string;
      model: string;
      modelVersion: string;
      value: unknown;
      confidence: number | null;
      generatedAt: string;
    }>;
  }

  public fetchPeopleCompare(params: { personIds: number[] }) {
    const aggregates = this.fetchPersonMetricAggregates();
    const byPerson = new Map(aggregates.rows.map((r) => [r.person_id, r]));
    return {
      people: params.personIds.map((id) => ({
        personId: id,
        metrics: byPerson.get(id) ?? null,
      })),
      baselines: aggregates.baselines,
    };
  }

  public fetchPersonMetricAggregates() {
    const stmt = this.db.prepare<
      {
        person_id: number;
        party: string | null;
        speech_count: number;
        initiative_count: number;
        interpellation_count: number;
        written_question_count: number;
        vote_total: number;
        vote_cast: number;
      },
      { $startDate: string | null; $endDateExclusive: string | null }
    >(personMetricAggregates);
    const rows = stmt.all({ $startDate: null, $endDateExclusive: null });
    stmt.finalize();
    return {
      rows,
      baselines: this.computeBaselinesFromRows(rows),
    };
  }

  public fetchPersonMetricsWithBaselines(params: { personId: string | number }) {
    const id =
      typeof params.personId === "string"
        ? Number.parseInt(params.personId, 10)
        : params.personId;
    const { rows, baselines } = this.fetchPersonMetricAggregates();
    const person = rows.find((r) => r.person_id === id) ?? null;
    const partyId = person?.party ?? null;
    const partyRows = partyId
      ? rows.filter((r) => r.party === partyId)
      : [];
    return {
      person,
      party: partyId
        ? this.computeAverageRow(partyRows, partyId)
        : null,
      parliament: baselines.parliament,
    };
  }

  public fetchBaselines(params: { partyId?: string | null }) {
    const { rows, baselines } = this.fetchPersonMetricAggregates();
    if (params.partyId) {
      const partyRows = rows.filter((r) => r.party === params.partyId);
      return {
        parliament: baselines.parliament,
        party: this.computeAverageRow(partyRows, params.partyId),
      };
    }
    return baselines;
  }

  private computeBaselinesFromRows(
    rows: Array<{
      party: string | null;
      speech_count: number;
      initiative_count: number;
      interpellation_count: number;
      written_question_count: number;
      vote_total: number;
      vote_cast: number;
    }>,
  ) {
    const parliament = this.computeAverageRow(rows, null);
    const partyMap = new Map<
      string,
      typeof rows
    >();
    for (const r of rows) {
      if (!r.party) continue;
      const list = partyMap.get(r.party) ?? [];
      list.push(r);
      partyMap.set(r.party, list);
    }
    const parties: Record<string, ReturnType<typeof this.computeAverageRow>> =
      {};
    for (const [party, partyRows] of partyMap.entries()) {
      parties[party] = this.computeAverageRow(partyRows, party);
    }
    return { parliament, parties };
  }

  private computeAverageRow(
    rows: Array<{
      speech_count: number;
      initiative_count: number;
      interpellation_count: number;
      written_question_count: number;
      vote_total: number;
      vote_cast: number;
    }>,
    label: string | null,
  ) {
    const n = rows.length;
    if (n === 0) {
      return {
        label,
        n: 0,
        avgSpeechCount: 0,
        avgInitiativeCount: 0,
        avgInterpellationCount: 0,
        avgWrittenQuestionCount: 0,
        avgVoteParticipationRate: 0,
      };
    }
    const sum = rows.reduce(
      (acc, r) => {
        acc.speech += r.speech_count;
        acc.initiative += r.initiative_count;
        acc.interpellation += r.interpellation_count;
        acc.writtenQ += r.written_question_count;
        acc.voteTotal += r.vote_total;
        acc.voteCast += r.vote_cast;
        return acc;
      },
      {
        speech: 0,
        initiative: 0,
        interpellation: 0,
        writtenQ: 0,
        voteTotal: 0,
        voteCast: 0,
      },
    );
    return {
      label,
      n,
      avgSpeechCount: sum.speech / n,
      avgInitiativeCount: sum.initiative / n,
      avgInterpellationCount: sum.interpellation / n,
      avgWrittenQuestionCount: sum.writtenQ / n,
      avgVoteParticipationRate:
        sum.voteTotal > 0 ? sum.voteCast / sum.voteTotal : 0,
    };
  }

  public fetchPersonDissents(params: { personId: string; limit?: number }) {
    const stmt = this.db.prepare<
      {
        voting_id: number;
        start_time: string;
        title: string;
        section_title: string;
        mp_vote: string;
        majority_vote: string;
        party_name: string;
      },
      { $personId: number; $limit: number }
    >(personDissents);
    const data = stmt.all({
      $personId: +params.personId,
      $limit: params.limit ?? 100,
    });
    stmt.finalize();
    return data;
  }
}
