/** A single source that backs a displayed figure. */
export interface ProvenanceSource {
  /** Raw API table name — must be a key in TABLE_META for best results. */
  table: string;
  /** Primary key column name as stored in trace DB (e.g. "AanestysId"). */
  pkName?: string;
  /** Primary key value for row-level trace lookup. */
  pkValue?: string | number;
  /** Human-readable label shown in the trace popover's "Tietue" field. */
  label?: string;
}

/** Structured provenance descriptor for one displayed figure. */
export interface ProvenanceInfo {
  sources: ProvenanceSource[];
  /** Headline figure shown at top of trace popover. */
  value?: string;
  /** Explanatory caption shown below value. */
  caption?: string;
  /** Footnote marker override (default "∗"). */
  markText?: string;
}

/** Maps raw API table names to display metadata. */
export const TABLE_META: Record<
  string,
  { displayName: string; endpoint: string }
> = {
  SaliDBAanestys: {
    displayName: "Eduskunnan avoin data · Vote",
    endpoint: "GET /api/v1/tables/SaliDBAanestys/batch",
  },
  SaliDBAanestysEdustaja: {
    displayName: "Eduskunnan avoin data · Vote",
    endpoint: "GET /api/v1/tables/SaliDBAanestysEdustaja/batch",
  },
  MemberOfParliament: {
    displayName: "Eduskunnan avoin data · MemberOfParliament",
    endpoint: "GET /api/v1/tables/MemberOfParliament/batch",
  },
  SaliDBIstunto: {
    displayName: "Eduskunnan avoin data · Session",
    endpoint: "GET /api/v1/tables/SaliDBIstunto/batch",
  },
  SaliDBKohta: {
    displayName: "Eduskunnan avoin data · Section",
    endpoint: "GET /api/v1/tables/SaliDBKohta/batch",
  },
  SaliDBPuheenvuoro: {
    displayName: "Eduskunnan avoin data · Speech",
    endpoint: "GET /api/v1/tables/SaliDBPuheenvuoro/batch",
  },
  SaliDBKohtaAsiakirja: {
    displayName: "Eduskunnan avoin data · Asiakirjaviite",
    endpoint: "GET /api/v1/tables/SaliDBKohtaAsiakirja/batch",
  },
  SaliDBTiedote: {
    displayName: "Eduskunnan avoin data · Tiedote",
    endpoint: "GET /api/v1/tables/SaliDBTiedote/batch",
  },
  VaskiData: {
    displayName: "Eduskunnan avoin data · VaskiData",
    endpoint: "GET /api/v1/tables/VaskiData/batch",
  },
  "edk-documents": {
    displayName: "Eduskunnan dokumentit · PDF",
    endpoint: "GET /api/v1/asiakirjat/edktunnus/:edktunnus/pdf",
  },
  HetekaData: {
    displayName: "Eduskunnan avoin data · HetekaData",
    endpoint: "GET /api/v1/tables/HetekaData/batch",
  },
};
