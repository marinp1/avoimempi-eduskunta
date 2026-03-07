type DaySessionsResponse = ApiRouteResponse<`/api/day/:date/sessions`>;
type DaySession = DaySessionsResponse["sessions"][number];

export type SessionMinutesItem = {
  id: number;
  session_key: string;
  minutes_document_id: number;
  item_type: string;
  ordinal?: number | null;
  title?: string | null;
  identifier_text?: string | null;
  processing_title?: string | null;
  note?: string | null;
  source_item_id?: number | null;
  source_parent_item_id?: number | null;
  section_id?: number | null;
  section_key?: string | null;
};

export type SessionMinutesAttachment = {
  id: number;
  session_key: string;
  minutes_document_id: number;
  minutes_item_id?: number | null;
  title?: string | null;
  related_document_tunnus?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  native_id?: string | null;
};

export type SessionWithSections = DaySession & {
  minutes_items?: SessionMinutesItem[];
  minutes_attachments?: SessionMinutesAttachment[];
};
export type Section = NonNullable<SessionWithSections["sections"]>[number];
export type SessionDocument = NonNullable<
  SessionWithSections["documents"]
>[number];
export type SessionNotice = NonNullable<SessionWithSections["notices"]>[number];

export type SectionDocumentLink =
  ApiRouteItem<`/api/sections/:sectionKey/links`>;

export type SectionRollCallData =
  ApiRouteResponse<`/api/sections/:sectionKey/roll-call`>;
export type RollCallReport = NonNullable<SectionRollCallData>["report"];
export type RollCallEntry = NonNullable<SectionRollCallData>["entries"][number];

export type SubSection = ApiRouteItem<`/api/sections/:sectionKey/subsections`>;

export type MinutesContentReference = {
  vaskiId: number | null;
  code: string | null;
};

export type SpeechData = ApiRouteResponse<`/api/sections/:sectionKey/speeches`>;
export type Speech = SpeechData["speeches"][number];

export type Voting = ApiRouteItem<`/api/sections/:sectionKey/votings`>;
export type VotingInlineDetails = ApiRouteResponse<`/api/votings/:id/details`>;
