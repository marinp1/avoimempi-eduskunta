/**
 * Session API DTOs — stable external contracts for parliamentary session data.
 */

export interface SessionSectionDto {
  id: number;
  key: string;
  identifier: string;
  title: string | null;
  ordinal: number;
  processingTitle: string | null;
  resolution: string | null;
  votingCount: number;
  speechCount: number;
}

export interface SessionDocumentDto {
  documentKind: string;
  id: number;
  typeSlug: string;
  typeName: string | null;
  identifier: string | null;
  title: string | null;
  status: string | null;
  createdAt: string | null;
}

export interface SessionNoticeDto {
  id: number;
  noticeType: string | null;
  text: string | null;
  validUntil: string | null;
  sentAt: string | null;
}

export interface SessionDto {
  id: number;
  sessionNumber: number;
  key: string;
  date: string | null;
  year: number | null;
  type: string;
  state: string;
  description: string | null;
  startTimeActual: string | null;
  startTimeReported: string | null;
  endTime: string | null;
  agendaKey: string;
  agendaTitle: string | null;
  agendaState: string | null;
  sections: SessionSectionDto[];
  documents: SessionDocumentDto[];
  notices: SessionNoticeDto[];
}

export interface SessionsByDateDto {
  sessions: SessionDto[];
  latestSpeechDate: string | null;
}

interface SessionInput {
  id: number;
  number: number;
  key: string;
  date: string | null;
  year: number | null;
  type: string;
  state: string;
  description: string | null;
  start_time_actual: string | null;
  start_time_reported: string | null;
  end_time: string | null;
  agenda_key: string;
  agenda_title?: string | null;
  agenda_state?: string | null;
  sections?: SessionSectionInput[];
  documents?: SessionDocumentInput[];
  notices?: SessionNoticeInput[];
}

interface SessionSectionInput {
  id: number;
  key: string;
  identifier: string;
  title: string | null;
  ordinal: number;
  processing_title: string | null;
  resolution: string | null;
  voting_count?: number;
  speech_count?: number;
}

interface SessionDocumentInput {
  document_kind?: string;
  documentKind?: string;
  id: number;
  type_slug?: string;
  typeSlug?: string;
  type_name_fi?: string | null;
  typeName?: string | null;
  eduskunta_tunnus?: string | null;
  identifier?: string | null;
  title?: string | null;
  status_text?: string | null;
  status?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

interface SessionNoticeInput {
  id: number;
  notice_type: string | null;
  text_fi: string | null;
  valid_until: string | null;
  sent_at: string | null;
}

function buildSessionSectionDto(
  section: SessionSectionInput,
): SessionSectionDto {
  return {
    id: section.id,
    key: section.key,
    identifier: section.identifier,
    title: section.title ?? null,
    ordinal: section.ordinal,
    processingTitle: section.processing_title ?? null,
    resolution: section.resolution ?? null,
    votingCount: section.voting_count ?? 0,
    speechCount: section.speech_count ?? 0,
  };
}

function buildSessionDocumentDto(
  doc: SessionDocumentInput,
): SessionDocumentDto {
  return {
    documentKind: doc.document_kind ?? doc.documentKind ?? "unknown",
    id: doc.id,
    typeSlug: doc.type_slug ?? doc.typeSlug ?? "unknown",
    typeName: doc.type_name_fi ?? doc.typeName ?? null,
    identifier: doc.eduskunta_tunnus ?? doc.identifier ?? null,
    title: doc.title ?? null,
    status: doc.status_text ?? doc.status ?? null,
    createdAt: doc.created_at ?? doc.createdAt ?? null,
  };
}

function buildSessionNoticeDto(notice: SessionNoticeInput): SessionNoticeDto {
  return {
    id: notice.id,
    noticeType: notice.notice_type ?? null,
    text: notice.text_fi ?? null,
    validUntil: notice.valid_until ?? null,
    sentAt: notice.sent_at ?? null,
  };
}

export function buildSessionDto(row: SessionInput): SessionDto {
  return {
    id: row.id,
    sessionNumber: row.number,
    key: row.key,
    date: row.date ?? null,
    year: row.year ?? null,
    type: row.type,
    state: row.state,
    description: row.description ?? null,
    startTimeActual: row.start_time_actual ?? null,
    startTimeReported: row.start_time_reported ?? null,
    endTime: row.end_time ?? null,
    agendaKey: row.agenda_key,
    agendaTitle: row.agenda_title ?? null,
    agendaState: row.agenda_state ?? null,
    sections: (row.sections ?? []).map(buildSessionSectionDto),
    documents: (row.documents ?? []).map(buildSessionDocumentDto),
    notices: (row.notices ?? []).map(buildSessionNoticeDto),
  };
}

export function buildSessionsByDateDto(
  sessions: SessionInput[],
  latestSpeechDate: string | null,
): SessionsByDateDto {
  return {
    sessions: sessions.map(buildSessionDto),
    latestSpeechDate,
  };
}
