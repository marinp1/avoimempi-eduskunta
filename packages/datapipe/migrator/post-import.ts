import type { Database } from "bun:sqlite";
import { objectExists } from "./utils";

const withOptionalSubstrLimit = (
  expression: string,
  maxChars: number | null,
): string => {
  if (maxChars === null) return expression;
  return `SUBSTR(${expression}, 1, ${maxChars})`;
};

export function normalizeImportedTextData(db: Database): void {
  const normalizeTransaction = db.transaction(() => {
    if (objectExists(db, "table", "Interpellation")) {
      db.run(
        `UPDATE Interpellation
         SET
           title = NULLIF(TRIM(title), ''),
           question_text = NULLIF(TRIM(question_text), ''),
           resolution_text = NULLIF(TRIM(resolution_text), '')`,
      );
    }

    if (objectExists(db, "table", "GovernmentProposal")) {
      db.run(
        `UPDATE GovernmentProposal
         SET
           title = NULLIF(TRIM(title), ''),
           author = NULLIF(TRIM(author), ''),
           summary_text = NULLIF(TRIM(summary_text), ''),
           justification_text = NULLIF(TRIM(justification_text), ''),
           proposal_text = NULLIF(TRIM(proposal_text), ''),
           appendix_text = NULLIF(TRIM(appendix_text), '')`,
      );
    }

    if (objectExists(db, "table", "WrittenQuestion")) {
      db.run(
        `UPDATE WrittenQuestion
         SET
           title = NULLIF(TRIM(title), ''),
           question_text = NULLIF(TRIM(question_text), ''),
           answer_minister_title = NULLIF(TRIM(answer_minister_title), ''),
           answer_minister_first_name = NULLIF(TRIM(answer_minister_first_name), ''),
           answer_minister_last_name = NULLIF(TRIM(answer_minister_last_name), '')`,
      );
    }

    if (objectExists(db, "table", "WrittenQuestionResponse")) {
      db.run(
        `UPDATE WrittenQuestionResponse
         SET
           title = NULLIF(TRIM(title), ''),
           minister_title = NULLIF(TRIM(minister_title), ''),
           minister_first_name = NULLIF(TRIM(minister_first_name), ''),
           minister_last_name = NULLIF(TRIM(minister_last_name), ''),
           body_text = NULLIF(TRIM(body_text), '')`,
      );
    }

    if (objectExists(db, "table", "ExpertStatement")) {
      db.run(
        `UPDATE ExpertStatement
         SET
           title = NULLIF(TRIM(title), ''),
           body_text = NULLIF(TRIM(body_text), ''),
           analysis_summary = NULLIF(TRIM(analysis_summary), '')`,
      );
    }

    if (objectExists(db, "table", "OralQuestion")) {
      db.run(
        `UPDATE OralQuestion
         SET
           title = NULLIF(TRIM(title), ''),
           question_text = NULLIF(TRIM(question_text), ''),
           asker_text = NULLIF(TRIM(asker_text), ''),
           body_text = NULLIF(TRIM(body_text), '')`,
      );
    }

    if (objectExists(db, "table", "LegislativeInitiative")) {
      db.run(
        `UPDATE LegislativeInitiative
         SET
           title = NULLIF(TRIM(title), ''),
           justification_text = NULLIF(TRIM(justification_text), ''),
           proposal_text = NULLIF(TRIM(proposal_text), ''),
           law_text = NULLIF(TRIM(law_text), ''),
           body_text = NULLIF(TRIM(body_text), '')`,
      );
    }

    if (objectExists(db, "table", "CommitteeReport")) {
      db.run(
        `UPDATE CommitteeReport
         SET
           title = NULLIF(TRIM(title), ''),
           committee_name = NULLIF(TRIM(committee_name), ''),
           recipient_committee = NULLIF(TRIM(recipient_committee), ''),
           source_reference = NULLIF(TRIM(source_reference), '')`,
      );
    }

    if (objectExists(db, "table", "SectionDocumentLink")) {
      db.run(
        `UPDATE SectionDocumentLink
         SET
           link_text_fi = NULLIF(TRIM(link_text_fi), ''),
           name_fi = NULLIF(TRIM(name_fi), ''),
           key = NULLIF(TRIM(key), ''),
           link_url_fi = NULLIF(TRIM(link_url_fi), '')`,
      );
    }

    if (objectExists(db, "table", "SaliDBDocumentReference")) {
      db.run(
        `UPDATE SaliDBDocumentReference
         SET
           source_text = NULLIF(TRIM(source_text), ''),
           source_url = NULLIF(TRIM(source_url), ''),
           source_type = NULLIF(TRIM(source_type), ''),
           document_tunnus = NULLIF(TRIM(document_tunnus), '')`,
      );
    }

    if (objectExists(db, "table", "Vote")) {
      db.run(
        `UPDATE Vote
         SET group_abbreviation = LOWER(NULLIF(TRIM(group_abbreviation), ''))`,
      );
    }

    if (objectExists(db, "table", "Representative")) {
      db.run(
        `UPDATE Representative
         SET
           first_name = NULLIF(TRIM(first_name), ''),
           last_name = NULLIF(TRIM(last_name), ''),
           sort_name = NULLIF(TRIM(sort_name), ''),
           party = LOWER(NULLIF(TRIM(party), ''))`,
      );
    }
  });

  normalizeTransaction.immediate();
}

export function rebuildVotingPartyStats(db: Database): number {
  if (!objectExists(db, "table", "VotingPartyStats")) {
    return 0;
  }

  const rebuildTransaction = db.transaction(() => {
    db.run("DELETE FROM VotingPartyStats");
    db.run(
      `INSERT INTO VotingPartyStats (
         voting_id,
         party,
         votes_cast,
         total_votings,
         party_member_count,
         n_jaa,
         n_ei,
         n_tyhjaa,
         n_poissa
       )
       SELECT
         v.voting_id,
         v.group_abbreviation AS party,
         SUM(CASE WHEN v.vote != 'Poissa' THEN 1 ELSE 0 END) AS votes_cast,
         COUNT(*) AS total_votings,
         COUNT(DISTINCT v.person_id) AS party_member_count,
         SUM(CASE WHEN v.vote = 'Jaa' THEN 1 ELSE 0 END) AS n_jaa,
         SUM(CASE WHEN v.vote = 'Ei' THEN 1 ELSE 0 END) AS n_ei,
         SUM(CASE WHEN v.vote = 'Tyhjää' THEN 1 ELSE 0 END) AS n_tyhjaa,
         SUM(CASE WHEN v.vote = 'Poissa' THEN 1 ELSE 0 END) AS n_poissa
       FROM Vote v INDEXED BY idx_vote_voting_group_person_vote
       WHERE v.group_abbreviation IS NOT NULL
         AND TRIM(v.group_abbreviation) != ''
       GROUP BY v.voting_id, v.group_abbreviation`,
    );
  });

  rebuildTransaction.immediate();

  const row = db
    .query<{ count: number }, []>(
      "SELECT COUNT(*) AS count FROM VotingPartyStats",
    )
    .get();
  return row?.count ?? 0;
}

export function rebuildPersonVotingDailyStats(db: Database): number {
  if (!objectExists(db, "table", "PersonVotingDailyStats")) {
    return 0;
  }

  const rebuildTransaction = db.transaction(() => {
    db.run("DELETE FROM PersonVotingDailyStats");
    db.run(
      `INSERT INTO PersonVotingDailyStats (
         person_id,
         voting_date,
         votes_cast,
         total_votings
       )
       SELECT
         v.person_id,
         vt.start_date AS voting_date,
         SUM(CASE WHEN v.vote != 'Poissa' THEN 1 ELSE 0 END) AS votes_cast,
         COUNT(*) AS total_votings
       FROM Vote v INDEXED BY idx_vote_person_covering
       JOIN Voting vt ON vt.id = v.voting_id
       WHERE v.person_id IS NOT NULL
         AND vt.start_date IS NOT NULL
       GROUP BY v.person_id, vt.start_date`,
    );
  });

  rebuildTransaction.immediate();

  const row = db
    .query<{ count: number }, []>(
      "SELECT COUNT(*) AS count FROM PersonVotingDailyStats",
    )
    .get();
  return row?.count ?? 0;
}

export function rebuildPersonSpeechDailyStats(db: Database): number {
  if (!objectExists(db, "table", "PersonSpeechDailyStats")) {
    return 0;
  }

  const rebuildTransaction = db.transaction(() => {
    db.run("DELETE FROM PersonSpeechDailyStats");
    db.run(
      `INSERT INTO PersonSpeechDailyStats (
         person_id,
         speech_date,
         speech_count,
         total_words,
         first_speech,
         last_speech
       )
       SELECT
         sp.person_id,
         SUBSTR(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date), 1, 10) AS speech_date,
         COUNT(*) AS speech_count,
         SUM(
           CASE
             WHEN sc.content IS NULL OR TRIM(sc.content) = '' THEN 0
             ELSE LENGTH(TRIM(sc.content)) - LENGTH(REPLACE(TRIM(sc.content), ' ', '')) + 1
           END
         ) AS total_words,
         MIN(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date)) AS first_speech,
         MAX(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date)) AS last_speech
       FROM Speech sp
       LEFT JOIN SpeechContent sc ON sc.speech_id = sp.id
       LEFT JOIN Session sess ON sess.key = sp.session_key
       WHERE COALESCE(sp.has_spoken, 1) = 1
         AND sp.person_id IS NOT NULL
         AND COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date) IS NOT NULL
       GROUP BY sp.person_id, SUBSTR(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date), 1, 10)`,
    );
  });

  rebuildTransaction.immediate();

  const row = db
    .query<{ count: number }, []>(
      "SELECT COUNT(*) AS count FROM PersonSpeechDailyStats",
    )
    .get();
  return row?.count ?? 0;
}

export function rebuildFederatedSearchIndex(
  db: Database,
  searchBodyMaxChars: number | null,
): number {
  if (!objectExists(db, "table", "FederatedSearchFts")) {
    return 0;
  }

  const representativeBodySql = withOptionalSubstrLimit(
    `TRIM(
           COALESCE(r.first_name, '') || ' ' ||
           COALESCE(r.last_name, '') || ' ' ||
           COALESCE(r.party, '') || ' ' ||
           COALESCE(r.profession, '')
         )`,
    searchBodyMaxChars,
  );
  const votingBodySql = withOptionalSubstrLimit(
    `TRIM(
           COALESCE(v.title, '') || ' ' ||
           COALESCE(v.section_title, '') || ' ' ||
           COALESCE(v.main_section_title, '') || ' ' ||
           COALESCE(v.agenda_title, '') || ' ' ||
           COALESCE(v.section_processing_title, '') || ' ' ||
           COALESCE(v.session_key, '')
         )`,
    searchBodyMaxChars,
  );
  const interpellationBodySql = withOptionalSubstrLimit(
    `TRIM(
           COALESCE(i.title, '') || ' ' ||
           COALESCE(i.parliament_identifier, '') || ' ' ||
           COALESCE(i.question_text, '') || ' ' ||
           COALESCE(i.resolution_text, '')
         )`,
    searchBodyMaxChars,
  );
  const governmentProposalBodySql = withOptionalSubstrLimit(
    `TRIM(
           COALESCE(g.title, '') || ' ' ||
           COALESCE(g.parliament_identifier, '') || ' ' ||
           COALESCE(g.summary_text, '') || ' ' ||
           COALESCE(g.justification_text, '')
         )`,
    searchBodyMaxChars,
  );
  const writtenQuestionBodySql = withOptionalSubstrLimit(
    `TRIM(
           COALESCE(wq.title, '') || ' ' ||
           COALESCE(wq.parliament_identifier, '') || ' ' ||
           COALESCE(wq.question_text, '')
         )`,
    searchBodyMaxChars,
  );
  const oralQuestionBodySql = withOptionalSubstrLimit(
    `TRIM(
           COALESCE(oq.title, '') || ' ' ||
           COALESCE(oq.parliament_identifier, '') || ' ' ||
           COALESCE(oq.question_text, '') || ' ' ||
           COALESCE(oq.asker_text, '') || ' ' ||
           COALESCE(oq.body_text, '')
         )`,
    searchBodyMaxChars,
  );
  const legislativeInitiativeBodySql = withOptionalSubstrLimit(
    `TRIM(
           COALESCE(li.title, '') || ' ' ||
           COALESCE(li.parliament_identifier, '') || ' ' ||
           COALESCE(li.justification_text, '') || ' ' ||
           COALESCE(li.proposal_text, '') || ' ' ||
           COALESCE(li.body_text, '')
         )`,
    searchBodyMaxChars,
  );
  const expertStatementBodySql = withOptionalSubstrLimit(
    `TRIM(
           COALESCE(es.title, '') || ' ' ||
           COALESCE(es.committee_name, '') || ' ' ||
           COALESCE(es.body_text, '') || ' ' ||
           COALESCE(es.analysis_summary, '')
         )`,
    searchBodyMaxChars,
  );
  const writtenQuestionResponseBodySql = withOptionalSubstrLimit(
    `TRIM(
           COALESCE(wqr.title, '') || ' ' ||
           COALESCE(wqr.parliament_identifier, '') || ' ' ||
           COALESCE(wqr.body_text, '')
         )`,
    searchBodyMaxChars,
  );

  const rebuildTransaction = db.transaction(() => {
    db.run("DELETE FROM FederatedSearchFts");

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       SELECT
         'mp',
         CAST(r.person_id AS TEXT),
         COALESCE(
           NULLIF(TRIM(COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')), ''),
           NULLIF(TRIM(r.sort_name), ''),
           CAST(r.person_id AS TEXT)
         ),
         NULLIF(TRIM(r.party), ''),
         ${representativeBodySql},
         NULL
       FROM Representative r
       WHERE EXISTS (
         SELECT 1
         FROM Term t
         WHERE t.person_id = r.person_id
           AND t.end_date IS NULL
       )`,
    );

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       SELECT
         'voting',
         CAST(v.id AS TEXT),
         COALESCE(
           NULLIF(TRIM(v.section_title), ''),
           NULLIF(TRIM(v.title), ''),
           'Voting ' || CAST(v.id AS TEXT)
         ),
         'Jaa: ' || COALESCE(v.n_yes, 0) || ' / Ei: ' || COALESCE(v.n_no, 0),
         ${votingBodySql},
         v.start_time
       FROM Voting v`,
    );

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       SELECT
         'interpellation',
         CAST(i.id AS TEXT),
         COALESCE(NULLIF(TRIM(i.title), ''), i.parliament_identifier),
         i.parliament_identifier,
         ${interpellationBodySql},
         i.submission_date
       FROM Interpellation i`,
    );

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       SELECT
         'government-proposal',
         CAST(g.id AS TEXT),
         COALESCE(NULLIF(TRIM(g.title), ''), g.parliament_identifier),
         g.parliament_identifier,
         ${governmentProposalBodySql},
         g.submission_date
       FROM GovernmentProposal g`,
    );

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       SELECT
         'written-question',
         CAST(wq.id AS TEXT),
         COALESCE(NULLIF(TRIM(wq.title), ''), wq.parliament_identifier),
         wq.parliament_identifier,
         ${writtenQuestionBodySql},
         wq.submission_date
       FROM WrittenQuestion wq`,
    );

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       SELECT
         'oral-question',
         CAST(oq.id AS TEXT),
         COALESCE(NULLIF(TRIM(oq.title), ''), oq.parliament_identifier),
         oq.parliament_identifier,
         ${oralQuestionBodySql},
         oq.submission_date
       FROM OralQuestion oq`,
    );

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       SELECT
         'legislative-initiative',
         CAST(li.id AS TEXT),
         COALESCE(NULLIF(TRIM(li.title), ''), li.parliament_identifier),
         li.parliament_identifier,
         ${legislativeInitiativeBodySql},
         li.submission_date
       FROM LegislativeInitiative li`,
    );

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       SELECT
         'expert-statement',
         CAST(es.id AS TEXT),
         COALESCE(NULLIF(TRIM(es.title), ''), es.edk_identifier),
         es.edk_identifier,
         ${expertStatementBodySql},
         es.meeting_date
       FROM ExpertStatement es`,
    );

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       SELECT
         'written-question-response',
         CAST(wqr.id AS TEXT),
         COALESCE(NULLIF(TRIM(wqr.title), ''), wqr.parliament_identifier),
         wqr.parliament_identifier,
         ${writtenQuestionResponseBodySql},
         wqr.answer_date
       FROM WrittenQuestionResponse wqr`,
    );
  });

  rebuildTransaction.immediate();

  const row = db
    .query<{ count: number }, []>(
      "SELECT COUNT(*) AS count FROM FederatedSearchFts",
    )
    .get();
  return row?.count ?? 0;
}

export function rebuildPartySummary(db: Database): number {
  if (!objectExists(db, "table", "PartySummary")) {
    return 0;
  }

  const asOfDate =
    db
      .query<{ date: string }, []>(
        "SELECT MAX(date) AS date FROM Session WHERE date IS NOT NULL",
      )
      .get()?.date ?? new Date().toISOString().substring(0, 10);

  const stmt = db.prepare<
    unknown,
    {
      $asOfDate: string;
      $startDate: null;
      $endDateExclusive: null;
      $governmentName: null;
      $governmentStartDate: null;
    }
  >(
    `INSERT INTO PartySummary (
       party_code,
       party_display_code,
       party_name,
       member_count,
       is_in_government,
       votes_cast,
       total_votings,
       participation_rate,
       female_count,
       male_count,
       average_age
     )
     WITH window AS (
       SELECT
         COALESCE($startDate, $asOfDate) AS start_date,
         COALESCE(DATE($endDateExclusive, '-1 day'), $asOfDate) AS end_date
     ),
     active_members AS (
       SELECT
         pgm.group_code,
         pgm.group_name,
         pgm.group_abbreviation,
         pgm.person_id,
         pgm.start_date,
         pgm.end_date
       FROM ParliamentaryGroupMembership pgm
       WHERE pgm.start_date IS NOT NULL
         AND pgm.start_date <= $asOfDate
         AND (pgm.end_date IS NULL OR pgm.end_date >= $asOfDate)
       GROUP BY
         pgm.group_code,
         pgm.group_name,
         pgm.group_abbreviation,
         pgm.person_id,
         pgm.start_date,
         pgm.end_date
     ),
     member_stats AS (
       SELECT
         am.group_code,
         am.group_name,
         MIN(am.group_abbreviation) AS group_abbreviation,
         COUNT(*) AS member_count
       FROM active_members am
       GROUP BY am.group_code, am.group_name
     ),
     recent_votings AS (
       SELECT id, start_date
       FROM Voting
       WHERE start_date <= $asOfDate
         AND start_date >= COALESCE($startDate, DATE($asOfDate, '-6 months'))
         AND ($endDateExclusive IS NULL OR start_date < $endDateExclusive)
     ),
     vote_stats AS (
       SELECT
         pgm.group_code,
         SUM(CASE WHEN v.vote IN ('Jaa', 'Ei', 'Tyhjää') THEN 1 ELSE 0 END) AS votes_cast,
         COUNT(*) AS total_votings,
         ROUND(
           100.0 * SUM(CASE WHEN v.vote IN ('Jaa', 'Ei', 'Tyhjää') THEN 1 ELSE 0 END) /
           NULLIF(COUNT(*), 0),
           1
         ) AS participation_rate
       FROM recent_votings rv
       JOIN Vote v INDEXED BY idx_vote_voting_group_vote ON v.voting_id = rv.id
       JOIN ParliamentaryGroupMembership pgm INDEXED BY idx_pgm_person_dates
         ON pgm.person_id = v.person_id
         AND pgm.start_date <= rv.start_date
         AND (pgm.end_date IS NULL OR pgm.end_date >= rv.start_date)
       GROUP BY pgm.group_code
     ),
     display_code_candidates AS (
       SELECT
         pgm.group_code,
         v.group_abbreviation,
         MAX(v.voting_id) AS latest_voting_id
       FROM recent_votings rv
       JOIN Vote v INDEXED BY idx_vote_voting_group_vote ON v.voting_id = rv.id
       JOIN ParliamentaryGroupMembership pgm INDEXED BY idx_pgm_person_dates
         ON pgm.person_id = v.person_id
         AND pgm.start_date <= rv.start_date
         AND (pgm.end_date IS NULL OR pgm.end_date >= rv.start_date)
       WHERE v.group_abbreviation IS NOT NULL
         AND TRIM(v.group_abbreviation) != ''
       GROUP BY pgm.group_code, v.group_abbreviation
     ),
     display_codes AS (
       SELECT
         dcc.group_code,
         MIN(dcc.group_abbreviation) AS party_display_code
       FROM display_code_candidates dcc
       JOIN (
         SELECT
           group_code,
           MAX(latest_voting_id) AS latest_voting_id
         FROM display_code_candidates
         GROUP BY group_code
       ) latest
         ON latest.group_code = dcc.group_code
         AND latest.latest_voting_id = dcc.latest_voting_id
       GROUP BY dcc.group_code
     ),
     gov_groups AS (
       SELECT
         pgm.group_code,
         MAX(CASE WHEN gm.id IS NOT NULL THEN 1 ELSE 0 END) AS is_in_government
       FROM GovernmentMembership gm
       JOIN Government g ON g.id = gm.government_id
       JOIN ParliamentaryGroupMembership pgm
         ON pgm.person_id = gm.person_id
         AND pgm.start_date <= COALESCE(gm.end_date, '9999-12-31')
         AND (pgm.end_date IS NULL OR pgm.end_date >= gm.start_date)
       CROSS JOIN window w
       WHERE gm.start_date <= w.end_date
         AND (gm.end_date IS NULL OR gm.end_date >= w.start_date)
         AND (g.end_date IS NULL OR g.end_date > w.start_date)
         AND (
           $governmentName IS NULL OR (
             TRIM(g.name) = TRIM($governmentName)
             AND g.start_date = $governmentStartDate
           )
         )
       GROUP BY pgm.group_code
     ),
     demo_stats AS (
       SELECT
         am.group_code,
         SUM(CASE WHEN r.gender = 'Nainen' THEN 1 ELSE 0 END) AS female_count,
         SUM(CASE WHEN r.gender = 'Mies' THEN 1 ELSE 0 END) AS male_count,
         AVG(
           CASE
             WHEN r.birth_date IS NOT NULL THEN (JULIANDAY($asOfDate) - JULIANDAY(r.birth_date)) / 365.25
             ELSE NULL
           END
         ) AS avg_age
       FROM active_members am
       JOIN Representative r ON r.person_id = am.person_id
       GROUP BY am.group_code
     )
     SELECT
       ms.group_code,
       COALESCE(dc.party_display_code, ms.group_abbreviation, ms.group_code),
       ms.group_name,
       ms.member_count,
       COALESCE(gg.is_in_government, 0),
       COALESCE(vs.votes_cast, 0),
       COALESCE(vs.total_votings, 0),
       COALESCE(vs.participation_rate, 0),
       COALESCE(ds.female_count, 0),
       COALESCE(ds.male_count, 0),
       ROUND(COALESCE(ds.avg_age, 0), 1)
     FROM member_stats ms
     LEFT JOIN display_codes dc ON dc.group_code = ms.group_code
     LEFT JOIN gov_groups gg ON gg.group_code = ms.group_code
     LEFT JOIN demo_stats ds ON ds.group_code = ms.group_code
     LEFT JOIN vote_stats vs ON vs.group_code = ms.group_code
     ORDER BY ms.member_count DESC`,
  );

  const rebuildTransaction = db.transaction(() => {
    db.run("DELETE FROM PartySummary");
    stmt.run({
      $asOfDate: asOfDate,
      $startDate: null,
      $endDateExclusive: null,
      $governmentName: null,
      $governmentStartDate: null,
    });
  });

  rebuildTransaction.immediate();
  stmt.finalize();

  const row = db
    .query<{ count: number }, []>("SELECT COUNT(*) AS count FROM PartySummary")
    .get();
  return row?.count ?? 0;
}
