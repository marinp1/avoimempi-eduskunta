import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { getDatabasePath } from "../../shared/database";
import { StatusController } from "../controllers/status-controller";
import { DatabaseConnection } from "../database/db";

type CandidateSample = {
  id: number | string;
  label: string;
  sourceUrl: string;
};

type CandidateEvidence = {
  key: string;
  title: string;
  count: number;
  samples: CandidateSample[];
};

type CandidateCheckReport = {
  name: string;
  category: string;
  description: string;
  details: string;
  evidence: CandidateEvidence[];
};

type EvidenceQueryDefinition = {
  key: string;
  title: string;
  countSql: string;
  sampleSql: string;
};

const DEFAULT_SOURCE_URL = "https://avoindata.eduskunta.fi";

const EVIDENCE_QUERIES_BY_CHECK_NAME: Record<
  string,
  EvidenceQueryDefinition[]
> = {
  "Section → Session links": [
    {
      key: "orphan_sections",
      title: "Sections with missing Session",
      countSql: `SELECT COUNT(*) as c FROM Section sec
                   WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sec.session_key)`,
      sampleSql: `SELECT sec.key as id,
                           'Section ' || sec.key || ' viittaa puuttuvaan session_key=' || COALESCE(sec.session_key, '(null)') as label,
                           '${DEFAULT_SOURCE_URL}' as source_url
                    FROM Section sec
                    WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sec.session_key)
                    ORDER BY sec.key
                    LIMIT 50`,
    },
  ],
  "Parliament size limit": [
    {
      key: "oversized_dates",
      title: "Session dates with active MPs > 200",
      countSql: `SELECT COUNT(*) as c FROM (
                     SELECT s.date, COUNT(DISTINCT r.person_id) as mp_count
                     FROM Session s
                     JOIN Term t ON t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
                     JOIN Representative r ON r.person_id = t.person_id
                     WHERE NOT EXISTS (
                       SELECT 1 FROM TemporaryAbsence ta
                       WHERE ta.person_id = r.person_id
                         AND ta.start_date <= s.date
                         AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                     )
                     GROUP BY s.date
                     HAVING mp_count > 200
                   )`,
      sampleSql: `SELECT date as id,
                           'Päivä ' || date || ': aktiivisia edustajia ' || mp_count as label,
                           '${DEFAULT_SOURCE_URL}' as source_url
                    FROM (
                      SELECT s.date as date, COUNT(DISTINCT r.person_id) as mp_count
                      FROM Session s
                      JOIN Term t ON t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
                      JOIN Representative r ON r.person_id = t.person_id
                      WHERE NOT EXISTS (
                        SELECT 1 FROM TemporaryAbsence ta
                        WHERE ta.person_id = r.person_id
                          AND ta.start_date <= s.date
                          AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                      )
                      GROUP BY s.date
                      HAVING mp_count > 200
                    )
                    ORDER BY date
                    LIMIT 50`,
    },
  ],
  "Voting → Session links": [
    {
      key: "orphan_votings",
      title: "Votings with missing Session",
      countSql: `SELECT COUNT(*) as c FROM Voting v
                   WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = v.session_key)`,
      sampleSql: `SELECT v.id as id,
                           'Äänestys ' || v.id || ', session_key=' || COALESCE(v.session_key, '(null)') as label,
                           COALESCE(v.result_url, '${DEFAULT_SOURCE_URL}') as source_url
                    FROM Voting v
                    WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = v.session_key)
                    ORDER BY v.id
                    LIMIT 50`,
    },
  ],
  "Valid vote values": [
    {
      key: "invalid_vote_values",
      title: "Vote rows with invalid vote value",
      countSql: `SELECT COUNT(*) as c FROM Vote
                   WHERE vote NOT IN ('Jaa', 'Ei', 'Tyhjää', 'Poissa')`,
      sampleSql: `SELECT vo.id as id,
                           'Vote #' || vo.id || ': voting_id=' || vo.voting_id || ', person_id=' || vo.person_id || ', vote=' || COALESCE(vo.vote, '(null)') as label,
                           COALESCE(v.result_url, '${DEFAULT_SOURCE_URL}') as source_url
                    FROM Vote vo
                    LEFT JOIN Voting v ON v.id = vo.voting_id
                    WHERE vo.vote NOT IN ('Jaa', 'Ei', 'Tyhjää', 'Poissa')
                    ORDER BY vo.id
                    LIMIT 50`,
    },
  ],
  "SectionDocumentLink -> Section": [
    {
      key: "section_document_link_orphans",
      title: "SectionDocumentLink rows with missing Section",
      countSql: `SELECT COUNT(*) as c FROM SectionDocumentLink sdl
                   WHERE NOT EXISTS (SELECT 1 FROM Section s WHERE s.key = sdl.section_key)`,
      sampleSql: `SELECT sdl.id as id,
                           'SectionDocumentLink #' || sdl.id || ' -> section_key=' || COALESCE(sdl.section_key, '(null)') as label,
                           COALESCE(sdl.link_url_fi, '${DEFAULT_SOURCE_URL}') as source_url
                    FROM SectionDocumentLink sdl
                    WHERE NOT EXISTS (SELECT 1 FROM Section s WHERE s.key = sdl.section_key)
                    ORDER BY sdl.id
                    LIMIT 50`,
    },
  ],
  "SessionNotice -> Session": [
    {
      key: "session_notice_orphans",
      title: "SessionNotice rows with missing Session",
      countSql: `SELECT COUNT(*) as c FROM SessionNotice sn
                   WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sn.session_key)`,
      sampleSql: `SELECT sn.id as id,
                           'SessionNotice #' || sn.id || ' -> session_key=' || COALESCE(sn.session_key, '(null)') as label,
                           '${DEFAULT_SOURCE_URL}' as source_url
                    FROM SessionNotice sn
                    WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sn.session_key)
                    ORDER BY sn.id
                    LIMIT 50`,
    },
  ],
  "SaliDBDocumentReference -> Section": [
    {
      key: "document_reference_section_orphans",
      title: "SaliDBDocumentReference rows with missing Section",
      countSql: `SELECT COUNT(*) as c FROM SaliDBDocumentReference dr
                   WHERE dr.section_key IS NOT NULL
                     AND NOT EXISTS (SELECT 1 FROM Section s WHERE s.key = dr.section_key)`,
      sampleSql: `SELECT dr.id as id,
                           'DocRef #' || dr.id || ' -> section_key=' || COALESCE(dr.section_key, '(null)') || ', tunnus=' || COALESCE(dr.document_tunnus, '(null)') as label,
                           COALESCE(dr.source_url, '${DEFAULT_SOURCE_URL}') as source_url
                    FROM SaliDBDocumentReference dr
                    WHERE dr.section_key IS NOT NULL
                      AND NOT EXISTS (SELECT 1 FROM Section s WHERE s.key = dr.section_key)
                    ORDER BY dr.id
                    LIMIT 50`,
    },
  ],
  "Voting date within 1 day of session date": [
    {
      key: "voting_session_date_mismatch",
      title: "Voting rows with >1 day session date offset",
      countSql: `SELECT COUNT(*) as c FROM Voting v
                   JOIN Session s ON s.key = v.session_key
                   WHERE v.start_time IS NOT NULL
                     AND s.date IS NOT NULL
                     AND ABS(JULIANDAY(SUBSTR(v.start_time, 1, 10)) - JULIANDAY(s.date)) > 1`,
      sampleSql: `SELECT v.id as id,
                           'Äänestys ' || v.id || ': start=' || SUBSTR(v.start_time, 1, 10) || ', session=' || s.date as label,
                           COALESCE(v.result_url, '${DEFAULT_SOURCE_URL}') as source_url
                    FROM Voting v
                    JOIN Session s ON s.key = v.session_key
                    WHERE v.start_time IS NOT NULL
                      AND s.date IS NOT NULL
                      AND ABS(JULIANDAY(SUBSTR(v.start_time, 1, 10)) - JULIANDAY(s.date)) > 1
                    ORDER BY v.id
                    LIMIT 50`,
    },
  ],
  "Committee membership dates valid": [
    {
      key: "committee_date_order_invalid",
      title: "CommitteeMembership rows with start_date > end_date",
      countSql: `SELECT COUNT(*) as c FROM CommitteeMembership
                   WHERE end_date IS NOT NULL AND start_date > end_date`,
      sampleSql: `SELECT id as id,
                           'CommitteeMembership #' || id || ': ' || COALESCE(start_date, '(null)') || ' > ' || COALESCE(end_date, '(null)') as label,
                           '${DEFAULT_SOURCE_URL}' as source_url
                    FROM CommitteeMembership
                    WHERE end_date IS NOT NULL AND start_date > end_date
                    ORDER BY id
                    LIMIT 50`,
    },
  ],
  "Active MPs have group membership": [
    {
      key: "active_mp_without_group",
      title: "Active MPs missing group membership",
      countSql: `SELECT COUNT(*) as c FROM (
                     SELECT DISTINCT s.date, t.person_id
                     FROM Session s
                     JOIN Term t ON t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
                     WHERE NOT EXISTS (
                       SELECT 1 FROM TemporaryAbsence ta
                       WHERE ta.person_id = t.person_id
                         AND ta.start_date <= s.date
                         AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                     )
                     AND NOT EXISTS (
                       SELECT 1 FROM ParliamentaryGroupMembership pgm
                       WHERE pgm.person_id = t.person_id
                         AND pgm.start_date <= s.date
                         AND (pgm.end_date IS NULL OR pgm.end_date >= s.date)
                     )
                   )`,
      sampleSql: `SELECT date || '-' || person_id as id,
                           'Päivä ' || date || ': person_id ' || person_id || ' ilman ryhmäjäsenyyttä' as label,
                           '${DEFAULT_SOURCE_URL}' as source_url
                    FROM (
                      SELECT DISTINCT s.date as date, t.person_id as person_id
                      FROM Session s
                      JOIN Term t ON t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
                      WHERE NOT EXISTS (
                        SELECT 1 FROM TemporaryAbsence ta
                        WHERE ta.person_id = t.person_id
                          AND ta.start_date <= s.date
                          AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                      )
                      AND NOT EXISTS (
                        SELECT 1 FROM ParliamentaryGroupMembership pgm
                        WHERE pgm.person_id = t.person_id
                          AND pgm.start_date <= s.date
                          AND (pgm.end_date IS NULL OR pgm.end_date >= s.date)
                      )
                    )
                    ORDER BY date, person_id
                    LIMIT 50`,
    },
  ],
  "Group member count matches active MPs": [
    {
      key: "active_group_member_mismatch",
      title: "Dates where active group-member count mismatches active MPs",
      countSql: `SELECT COUNT(*) as c FROM (
                     SELECT s.date,
                       (SELECT COUNT(DISTINCT t.person_id) FROM Term t
                        WHERE t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
                        AND NOT EXISTS (
                          SELECT 1 FROM TemporaryAbsence ta
                          WHERE ta.person_id = t.person_id
                            AND ta.start_date <= s.date
                            AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                        )) as term_count,
                       (SELECT COUNT(DISTINCT pgm.person_id) FROM ParliamentaryGroupMembership pgm
                        WHERE pgm.start_date <= s.date AND (pgm.end_date IS NULL OR pgm.end_date >= s.date)
                        AND NOT EXISTS (
                          SELECT 1 FROM TemporaryAbsence ta
                          WHERE ta.person_id = pgm.person_id
                            AND ta.start_date <= s.date
                            AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                        )) as group_count
                     FROM Session s
                     WHERE s.date IS NOT NULL
                     GROUP BY s.date
                     HAVING term_count != group_count
                   )`,
      sampleSql: `SELECT date as id,
                           'Päivä ' || date || ': term_count=' || term_count || ', group_count=' || group_count as label,
                           '${DEFAULT_SOURCE_URL}' as source_url
                    FROM (
                      SELECT s.date as date,
                        (SELECT COUNT(DISTINCT t.person_id) FROM Term t
                         WHERE t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
                         AND NOT EXISTS (
                           SELECT 1 FROM TemporaryAbsence ta
                           WHERE ta.person_id = t.person_id
                             AND ta.start_date <= s.date
                             AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                         )) as term_count,
                        (SELECT COUNT(DISTINCT pgm.person_id) FROM ParliamentaryGroupMembership pgm
                         WHERE pgm.start_date <= s.date AND (pgm.end_date IS NULL OR pgm.end_date >= s.date)
                         AND NOT EXISTS (
                           SELECT 1 FROM TemporaryAbsence ta
                           WHERE ta.person_id = pgm.person_id
                             AND ta.start_date <= s.date
                             AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                         )) as group_count
                      FROM Session s
                      WHERE s.date IS NOT NULL
                      GROUP BY s.date
                      HAVING term_count != group_count
                    )
                    ORDER BY date
                    LIMIT 50`,
    },
  ],
  "Speech metadata/content mismatches are exactly has_spoken=0": [
    {
      key: "speech_unexpected_missing_content",
      title: "Speech rows missing SpeechContent when has_spoken != 0",
      countSql: `SELECT COUNT(*) as c FROM Speech sp
                   WHERE NOT EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id)
                     AND COALESCE(sp.has_spoken, 1) != 0`,
      sampleSql: `SELECT sp.id as id,
                           'Speech #' || sp.id || ': has_spoken=' || COALESCE(sp.has_spoken, 1) || ', section=' || COALESCE(sp.section_key, '(null)') as label,
                           '${DEFAULT_SOURCE_URL}' as source_url
                    FROM Speech sp
                    WHERE NOT EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id)
                      AND COALESCE(sp.has_spoken, 1) != 0
                    ORDER BY sp.id
                    LIMIT 50`,
    },
    {
      key: "speech_has_spoken_zero_with_content",
      title: "Speech rows with has_spoken=0 but SpeechContent exists",
      countSql: `SELECT COUNT(*) as c FROM Speech sp
                   WHERE COALESCE(sp.has_spoken, 1) = 0
                     AND EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id)`,
      sampleSql: `SELECT sp.id as id,
                           'Speech #' || sp.id || ': has_spoken=0 mutta content löytyy' as label,
                           '${DEFAULT_SOURCE_URL}' as source_url
                    FROM Speech sp
                    WHERE COALESCE(sp.has_spoken, 1) = 0
                      AND EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id)
                    ORDER BY sp.id
                    LIMIT 50`,
    },
  ],
  "SpeechContent speaker names match Speech metadata": [
    {
      key: "speech_content_name_mismatch",
      title: "SpeechContent rows where source name differs from Speech name",
      countSql: `SELECT COUNT(*) as c FROM SpeechContent sc
                   JOIN Speech sp ON sp.id = sc.speech_id
                   WHERE sc.source_first_name IS NOT NULL
                     AND TRIM(sc.source_first_name) != ''
                     AND sc.source_last_name IS NOT NULL
                     AND TRIM(sc.source_last_name) != ''
                     AND (
                       LOWER(TRIM(sc.source_first_name)) != LOWER(TRIM(sp.first_name))
                       OR LOWER(TRIM(sc.source_last_name)) != LOWER(TRIM(sp.last_name))
                     )`,
      sampleSql: `SELECT sc.speech_id as id,
                           'Speech #' || sc.speech_id || ': source=' || sc.source_first_name || ' ' || sc.source_last_name || ', speech=' || sp.first_name || ' ' || sp.last_name as label,
                           '${DEFAULT_SOURCE_URL}' as source_url
                    FROM SpeechContent sc
                    JOIN Speech sp ON sp.id = sc.speech_id
                    WHERE sc.source_first_name IS NOT NULL
                      AND TRIM(sc.source_first_name) != ''
                      AND sc.source_last_name IS NOT NULL
                      AND TRIM(sc.source_last_name) != ''
                      AND (
                        LOWER(TRIM(sc.source_first_name)) != LOWER(TRIM(sp.first_name))
                        OR LOWER(TRIM(sc.source_last_name)) != LOWER(TRIM(sp.last_name))
                      )
                    ORDER BY sc.speech_id
                    LIMIT 50`,
    },
  ],
};

const getCount = (db: Database, sql: string) => {
  const row = db.query(sql).get() as { c?: number } | null;
  return row?.c ?? 0;
};

const getSamples = (db: Database, sql: string): CandidateSample[] => {
  const rows = db.query(sql).all() as Array<{
    id?: number | string;
    label?: string;
    source_url?: string | null;
  }>;

  return rows.map((row, index) => ({
    id: row.id ?? index,
    label: row.label ?? `Candidate ${index + 1}`,
    sourceUrl: row.source_url || DEFAULT_SOURCE_URL,
  }));
};

const formatMarkdown = (report: {
  generatedAt: string;
  databasePath: string;
  unresolvedChecks: CandidateCheckReport[];
}) => {
  const lines: string[] = [];
  lines.push("# Known Exception Candidates");
  lines.push("");
  lines.push(
    `Generated: ${report.generatedAt}  \nDatabase: \`${report.databasePath}\``,
  );
  lines.push("");
  lines.push(
    "This report lists failing sanity checks with concrete candidate rows. It does not classify root cause.",
  );
  lines.push("");

  if (report.unresolvedChecks.length === 0) {
    lines.push("No unresolved failing checks were found.");
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  for (const check of report.unresolvedChecks) {
    lines.push(`## ${check.name}`);
    lines.push("");
    lines.push(`- Category: ${check.category}`);
    lines.push(`- Description: ${check.description}`);
    lines.push(`- Current details: ${check.details}`);
    lines.push("");

    if (check.evidence.length === 0) {
      lines.push("- No evidence query mapping configured yet.");
      lines.push("");
      continue;
    }

    for (const evidence of check.evidence) {
      lines.push(`### ${evidence.title}`);
      lines.push("");
      lines.push(`- Count: ${evidence.count}`);
      if (evidence.samples.length === 0) {
        lines.push("- Samples: none");
      } else {
        for (const sample of evidence.samples) {
          lines.push(`- [${sample.id}] ${sample.label} (${sample.sourceUrl})`);
        }
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
};

const run = async () => {
  const databasePath = getDatabasePath();
  const db = new Database(databasePath, { readonly: true });
  db.exec("PRAGMA query_only = ON;");

  const statusController = new StatusController(new DatabaseConnection());
  const sanity = await statusController.getSanityChecks();
  const unresolvedChecks = sanity.checks.filter(
    (check) => !check.passed && !check.knownExceptions?.length,
  );

  const reportChecks: CandidateCheckReport[] = unresolvedChecks.map((check) => {
    const evidenceDefinitions =
      EVIDENCE_QUERIES_BY_CHECK_NAME[check.name] ?? [];
    const evidence = evidenceDefinitions.map((definition) => ({
      key: definition.key,
      title: definition.title,
      count: getCount(db, definition.countSql),
      samples: getSamples(db, definition.sampleSql),
    }));

    return {
      name: check.name,
      category: check.category,
      description: check.description,
      details: check.details ?? check.errorMessage ?? "",
      evidence,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    databasePath,
    unresolvedChecks: reportChecks,
  };

  const issuesDir = join(process.cwd(), ".issues");
  mkdirSync(issuesDir, { recursive: true });

  const jsonPath = join(issuesDir, "known-exception-candidates.json");
  const mdPath = join(issuesDir, "known-exception-candidates.md");

  await Bun.write(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await Bun.write(mdPath, formatMarkdown(report));

  console.log(
    `Wrote candidate reports: ${jsonPath} and ${mdPath} (${reportChecks.length} unresolved checks)`,
  );

  db.close();
};

await run();
