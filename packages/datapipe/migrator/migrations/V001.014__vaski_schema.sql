DROP TABLE IF EXISTS ExcelSpeech;

DROP TABLE IF EXISTS DocumentSubject;

DROP TABLE IF EXISTS DocumentRelationship;

DROP TABLE IF EXISTS VaskiDocument;

CREATE TABLE VaskiDocument (
  id INTEGER PRIMARY KEY,
  eduskunta_tunnus TEXT,
  document_type_name TEXT,
  document_type_code TEXT,
  language_code TEXT,
  publicity_code TEXT,
  status TEXT,
  created TEXT,
  attachment_group_id INTEGER,
  version_text TEXT,
  laadinta_pvm TEXT,
  muu_tunnus TEXT,
  paatehtava_koodi TEXT,
  rakennemaarittely_nimi TEXT,
  message_type TEXT,
  message_id TEXT,
  message_created TEXT,
  transfer_code TEXT,
  meeting_id TEXT,
  meeting_org TEXT
);

CREATE TABLE VaskiIdentifier (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiSubject (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  subject_text TEXT NOT NULL,
  yso_url TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiRelationship (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL,
  target_eduskunta_tunnus TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiAttachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  native_id TEXT,
  use_type TEXT,
  file_name TEXT,
  file_path TEXT,
  format_name TEXT,
  format_version TEXT,
  hash_algorithm TEXT,
  hash_value TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiDocumentActor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  role_code TEXT,
  person_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  position_text TEXT,
  organization_text TEXT,
  extra_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE VaskiGovernmentProposal (
  document_id INTEGER PRIMARY KEY,
  title TEXT,
  alternative_title TEXT,
  document_number TEXT,
  parliamentary_year TEXT,
  summary_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  attachment_note TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiWrittenQuestion (
  document_id INTEGER PRIMARY KEY,
  title TEXT,
  document_number TEXT,
  parliamentary_year TEXT,
  question_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  signing_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiWrittenAnswer (
  document_id INTEGER PRIMARY KEY,
  title TEXT,
  document_number TEXT,
  parliamentary_year TEXT,
  answer_text TEXT,
  statement_text TEXT,
  signing_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiCommitteeReport (
  document_id INTEGER PRIMARY KEY,
  title TEXT,
  document_number TEXT,
  parliamentary_year TEXT,
  summary_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  minority_opinion_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiCommitteeOpinion (
  document_id INTEGER PRIMARY KEY,
  title TEXT,
  document_number TEXT,
  parliamentary_year TEXT,
  summary_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  minority_opinion_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiLegislativeInitiative (
  document_id INTEGER PRIMARY KEY,
  title TEXT,
  document_number TEXT,
  parliamentary_year TEXT,
  summary_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiParliamentInitiative (
  document_id INTEGER PRIMARY KEY,
  title TEXT,
  document_number TEXT,
  parliamentary_year TEXT,
  summary_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  signing_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiLetter (
  document_id INTEGER PRIMARY KEY,
  title TEXT,
  document_number TEXT,
  parliamentary_year TEXT,
  summary_text TEXT,
  memo_text TEXT,
  signing_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiAgenda (
  document_id INTEGER PRIMARY KEY,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiMeetingAgenda (
  document_id INTEGER PRIMARY KEY,
  meeting_start TEXT,
  meeting_end TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiMeetingMinutes (
  document_id INTEGER PRIMARY KEY,
  meeting_start TEXT,
  meeting_end TEXT,
  summary_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiMeetingPlan (
  document_id INTEGER PRIMARY KEY,
  plan_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiPlenaryMinutes (
  document_id INTEGER PRIMARY KEY,
  meeting_start TEXT,
  meeting_end TEXT,
  summary_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiMinutesAttachment (
  document_id INTEGER PRIMARY KEY,
  title TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiProceedingInfo (
  document_id INTEGER PRIMARY KEY,
  status_text TEXT,
  end_date TEXT,
  last_processing_phase TEXT,
  last_general_phase TEXT,
  decision_description TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiStatementProceedingInfo (
  document_id INTEGER PRIMARY KEY,
  statement_text TEXT,
  decision_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiBudgetLetter (
  document_id INTEGER PRIMARY KEY,
  summary_text TEXT,
  budget_justification_text TEXT,
  decision_text TEXT,
  statute_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiBudgetReport (
  document_id INTEGER PRIMARY KEY,
  summary_text TEXT,
  budget_justification_text TEXT,
  decision_text TEXT,
  minority_opinion_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiStatuteCollectionAnswer (
  document_id INTEGER PRIMARY KEY,
  statute_text TEXT,
  signing_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiStatuteCollectionBudgetLetter (
  document_id INTEGER PRIMARY KEY,
  budget_justification_text TEXT,
  statute_text TEXT,
  decision_text TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiStatistic (
  document_id INTEGER PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  time_range TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiAgendaItem (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  ordinal INTEGER,
  title TEXT,
  identifier TEXT,
  note TEXT,
  processing_title TEXT,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiMeetingParticipant (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  ordinal INTEGER,
  name TEXT,
  role TEXT,
  organization TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiMeetingEvent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  ordinal INTEGER,
  title TEXT,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  description TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiMeeting (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  ordinal INTEGER,
  meeting_start TEXT,
  meeting_end TEXT,
  title TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiMinutesSection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  section_ordinal INTEGER,
  title TEXT,
  agenda_item_identifier TEXT,
  processing_title TEXT,
  note TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE VaskiMinutesSpeech (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  section_ordinal INTEGER,
  ordinal INTEGER,
  person_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  party TEXT,
  position TEXT,
  speech_type TEXT,
  start_time TEXT,
  end_time TEXT,
  content TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE VaskiStatisticGroup (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  statistic_id INTEGER NOT NULL,
  ordinal INTEGER,
  title TEXT,
  FOREIGN KEY (statistic_id) REFERENCES VaskiStatistic(document_id)
);

CREATE TABLE VaskiStatisticValue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  ordinal INTEGER,
  label TEXT,
  value TEXT,
  FOREIGN KEY (group_id) REFERENCES VaskiStatisticGroup(id)
);

CREATE TABLE VaskiCommitteeReportMinorityOpinion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  ordinal INTEGER,
  text TEXT,
  person_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE VaskiCommitteeOpinionMinorityOpinion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  ordinal INTEGER,
  text TEXT,
  person_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE VaskiBudgetReportMinorityOpinion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  ordinal INTEGER,
  text TEXT,
  person_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);
