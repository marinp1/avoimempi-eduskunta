import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getDatabasePath } from "../packages/shared/database/index.ts";

type SessionRow = {
  key: string;
  date: string | null;
  start_time_actual: string | null;
};

type SectionRow = {
  key: string;
  title: string;
  identifier: string;
  processing_title: string | null;
  ordinal: number;
  minutes_content_text: string | null;
};

type SpeechRow = {
  first_name: string;
  last_name: string;
  party_abbreviation: string | null;
  ministry: string | null;
  content: string;
};

type DurationRow = {
  total_minutes: number | null;
};

type DocRef = {
  document_identifier: string;
  document_type: string;
};

const BODY_COLUMN_PRIORITY = [
  "summary_text",
  "question_text",
  "proposal_text",
  "justification_text",
];

function main() {
  const arg = process.argv[2];
  const outRoot = process.argv[3] ?? "out";
  if (!arg) {
    console.error(
      "Usage: bun scripts/section-transcript.ts <session-key|year> [output-dir]",
    );
    console.error(
      'Examples: bun scripts/section-transcript.ts "2024/5" out',
    );
    console.error("          bun scripts/section-transcript.ts 2024 out");
    process.exit(1);
  }

  const db = new Database(getDatabasePath(), { readonly: true });
  db.exec("PRAGMA journal_mode = WAL;");

  const isYear = /^\d{4}$/.test(arg);
  let sessionKeys: string[];

  if (isYear) {
    const rows = db
      .prepare<{ key: string }, [number]>(
        `SELECT key FROM Session WHERE year = ? ORDER BY number`,
      )
      .all(Number(arg));
    sessionKeys = rows.map((r) => r.key);
    if (sessionKeys.length === 0) {
      console.error(`No sessions found for year ${arg}`);
      process.exit(1);
    }
    console.log(`Found ${sessionKeys.length} sessions for year ${arg}`);
  } else {
    sessionKeys = [arg];
  }

  const sessionStmt = db.prepare<SessionRow, [string]>(
    `SELECT s.key, s.date, s.start_time_actual
     FROM Session s
     WHERE s.key = ?`,
  );

  const sectionStmt = db.prepare<SectionRow, [string]>(
    `SELECT key, title, identifier, processing_title, ordinal, minutes_content_text
     FROM Section
     WHERE session_key = ?
     ORDER BY ordinal`,
  );

  const speechStmt = db.prepare<SpeechRow, [string]>(
    `SELECT sp.first_name, sp.last_name, sp.party_abbreviation, sp.ministry,
            sc.content
     FROM Speech sp
     LEFT JOIN SpeechContent sc ON sc.speech_id = sp.id
     WHERE sp.section_key = ?
       AND COALESCE(sp.has_spoken, 1) = 1
       AND sc.content IS NOT NULL
     ORDER BY
       CASE WHEN sp.ordinal_number IS NULL THEN 1 ELSE 0 END,
       sp.ordinal_number,
       COALESCE(sc.start_time, sp.request_time, sp.created_datetime),
       sp.id`,
  );

  const docRefStmt = db.prepare<DocRef, [string]>(
    `SELECT document_identifier, document_type
     FROM SectionDocumentReference
     WHERE section_key = ?`,
  );

  const candidateTables = db
    .prepare<{ name: string }, []>(
      `SELECT m.name FROM sqlite_master m
       WHERE m.type = 'table'
         AND EXISTS (
           SELECT 1 FROM pragma_table_info(m.name) WHERE name = 'parliament_identifier'
         )`,
    )
    .all();

  const docContextStmts: ReturnType<
    typeof db.prepare<{ title: string | null; body: string | null }, [string]>
  >[] = [];
  for (const { name } of candidateTables) {
    const cols = db
      .prepare<{ name: string }, []>(`PRAGMA table_info(${name})`)
      .all()
      .map((c) => c.name);
    if (!cols.includes("title")) continue;
    const bodyCol = BODY_COLUMN_PRIORITY.find((c) => cols.includes(c));
    if (!bodyCol) continue;
    docContextStmts.push(
      db.prepare(
        `SELECT title, ${bodyCol} AS body FROM ${name} WHERE parliament_identifier = ?`,
      ),
    );
  }

  const durationStmt = db.prepare<DurationRow, [string]>(
    `SELECT SUM(
       (julianday(sc.end_time) - julianday(sc.start_time)) * 24 * 60
     ) AS total_minutes
     FROM Speech sp
     JOIN SpeechContent sc ON sc.speech_id = sp.id
     WHERE sp.section_key = ?
       AND COALESCE(sp.has_spoken, 1) = 1
       AND sc.start_time IS NOT NULL
       AND sc.end_time IS NOT NULL`,
  );

  if (!existsSync(outRoot)) mkdirSync(outRoot, { recursive: true });

  let totalSections = 0;
  let totalSessions = 0;

  for (const sessionKey of sessionKeys) {
    const session = sessionStmt.get(sessionKey);
    if (!session) {
      console.warn(`Session not found: ${sessionKey} (skipping)`);
      continue;
    }

    const datetime = session.start_time_actual || session.date || "";
    const sectionRows = sectionStmt.all(sessionKey);
    const sessionSlug = sessionKey.replace("/", "-");
    let sessionSectionCount = 0;

    for (const sec of sectionRows) {
      const speeches = speechStmt.all(sec.key);
      if (speeches.length === 0) continue;

      const duration = Math.round(
        durationStmt.get(sec.key)?.total_minutes ?? 0,
      );

      const speakers: {
        firstName: string;
        lastName: string;
        party: string;
        title: string;
      }[] = [];
      const lines: string[] = [];

      for (const row of speeches) {
        speakers.push({
          firstName: row.first_name,
          lastName: row.last_name,
          party: row.party_abbreviation?.toUpperCase() ?? "",
          title: row.ministry || "Kansanedustaja",
        });
        lines.push(row.content.replaceAll("\n", " "));
      }

      const metadata = {
        title: sec.title,
        identifier: sec.identifier,
        processingTitle: sec.processing_title ?? "",
        datetime,
        duration,
        speakers,
      };

      const refs = docRefStmt.all(sec.key);
      const contextBlocks: string[] = [];
      for (const ref of refs) {
        let row: { title: string | null; body: string | null } | null = null;
        for (const stmt of docContextStmts) {
          const hit = stmt.get(ref.document_identifier);
          if (hit?.body) {
            row = hit;
            break;
          }
        }
        if (!row) continue;
        const body = row.body?.trim();
        if (!body) continue;
        const header = `${ref.document_identifier} — ${ref.document_type}`;
        const title = row.title?.trim();
        const block = title
          ? `${header}\n${title}\n\n${body}`
          : `${header}\n\n${body}`;
        contextBlocks.push(block);
      }

      const typeCode = refs[0]?.document_identifier.split(/\s+/)[0] ?? "";
      const folderName = typeCode
        ? `${sessionSlug}-${sec.identifier}-${typeCode}`
        : `${sessionSlug}-${sec.identifier}`;
      const sectionDir = path.join(outRoot, folderName);
      mkdirSync(sectionDir, { recursive: true });

      writeFileSync(
        path.join(sectionDir, "metadata.json"),
        `${JSON.stringify(metadata, null, 2)}\n`,
      );
      writeFileSync(
        path.join(sectionDir, "discussion.txt"),
        `${lines.join("\n")}\n`,
      );

      const notes = sec.minutes_content_text?.trim();
      if (notes) {
        writeFileSync(path.join(sectionDir, "notes.txt"), `${notes}\n`);
      }

      if (contextBlocks.length > 0) {
        writeFileSync(
          path.join(sectionDir, "context.txt"),
          `${contextBlocks.join("\n\n---\n\n")}\n`,
        );
      }

      sessionSectionCount++;
      totalSections++;

      if (!isYear) {
        console.log(
          `${folderName} — ${sec.title.slice(0, 60)} (${speeches.length} speeches)`,
        );
      }
    }

    if (sessionSectionCount > 0) totalSessions++;
    if (isYear) {
      console.log(
        `${sessionKey}: ${sessionSectionCount} sections with speeches`,
      );
    }
  }

  db.close();

  console.log(
    `\nWrote ${totalSections} sections across ${totalSessions} sessions to ${outRoot}/`,
  );
}

main();
