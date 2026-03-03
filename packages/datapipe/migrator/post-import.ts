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
           minister_last_name = NULLIF(TRIM(minister_last_name), '')`,
      );
    }

    if (objectExists(db, "table", "OralQuestion")) {
      db.run(
        `UPDATE OralQuestion
         SET
           title = NULLIF(TRIM(title), ''),
           question_text = NULLIF(TRIM(question_text), ''),
           asker_text = NULLIF(TRIM(asker_text), '')`,
      );
    }

    if (objectExists(db, "table", "LegislativeInitiative")) {
      db.run(
        `UPDATE LegislativeInitiative
         SET
           title = NULLIF(TRIM(title), ''),
           justification_text = NULLIF(TRIM(justification_text), ''),
           proposal_text = NULLIF(TRIM(proposal_text), ''),
           law_text = NULLIF(TRIM(law_text), '')`,
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
       FROM Vote v INDEXED BY idx_vote_person_voting
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
           COALESCE(oq.asker_text, '')
         )`,
    searchBodyMaxChars,
  );
  const legislativeInitiativeBodySql = withOptionalSubstrLimit(
    `TRIM(
           COALESCE(li.title, '') || ' ' ||
           COALESCE(li.parliament_identifier, '') || ' ' ||
           COALESCE(li.justification_text, '') || ' ' ||
           COALESCE(li.proposal_text, '')
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
  });

  rebuildTransaction.immediate();

  const row = db
    .query<{ count: number }, []>(
      "SELECT COUNT(*) AS count FROM FederatedSearchFts",
    )
    .get();
  return row?.count ?? 0;
}
