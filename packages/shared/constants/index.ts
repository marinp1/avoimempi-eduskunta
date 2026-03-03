import path from "node:path";

/**
 * All tables present in API.
 */
export const TableNameMap = Object.freeze({
  Attachment: "Attachment",
  AttachmentGroup: "AttachmentGroup",
  HetekaData: "HetekaData",
  MemberOfParliament: "MemberOfParliament",
  PrimaryKeys: "PrimaryKeys",
  SaliDBAanestys: "SaliDBAanestys",
  SaliDBAanestysAsiakirja: "SaliDBAanestysAsiakirja",
  SaliDBAanestysEdustaja: "SaliDBAanestysEdustaja",
  SaliDBAanestysJakauma: "SaliDBAanestysJakauma",
  SaliDBAanestysKieli: "SaliDBAanestysKieli",
  SaliDBIstunto: "SaliDBIstunto",
  SaliDBKohta: "SaliDBKohta",
  SaliDBKohtaAanestys: "SaliDBKohtaAanestys",
  SaliDBKohtaAsiakirja: "SaliDBKohtaAsiakirja",
  SaliDBMessageLog: "SaliDBMessageLog",
  SaliDBPuheenvuoro: "SaliDBPuheenvuoro",
  SaliDBTiedote: "SaliDBTiedote",
  SeatingOfParliament: "SeatingOfParliament",
  VaskiData: "VaskiData",
});

export const TableNames = Object.values(TableNameMap);

export type TableName = (typeof TableNames)[number];

export const PrimaryKeys: Record<TableName, string> = {
  Attachment: "",
  AttachmentGroup: "",
  HetekaData: "",
  MemberOfParliament: "personId",
  PrimaryKeys: "",
  SaliDBAanestys: "AanestysId",
  SaliDBAanestysAsiakirja: "",
  SaliDBAanestysEdustaja: "EdustajaId",
  SaliDBAanestysJakauma: "",
  SaliDBAanestysKieli: "",
  SaliDBIstunto: "Id",
  SaliDBKohta: "Id",
  SaliDBKohtaAanestys: "Id",
  SaliDBKohtaAsiakirja: "Id",
  SaliDBMessageLog: "Id",
  SaliDBPuheenvuoro: "",
  SaliDBTiedote: "Id",
  SeatingOfParliament: "",
  VaskiData: "Id",
};

/**
 * Tables omitted from data pipeline.
 */
export const OmittedPipelineTableNames = [
  "HetekaData", // Empty
  "PrimaryKeys", // Unnecessary
  "SaliDBAanestysAsiakirja", // Unnecessary
  "SaliDBAanestysJakauma", // Unnecessary
  "SaliDBAanestysKieli", // Unnecessary
  "SaliDBMessageLog", // Empty
] as const satisfies Array<(typeof TableNames)[number]>;

export const isOmittedPipelineTable = (tableName: string): boolean =>
  OmittedPipelineTableNames.includes(
    tableName as (typeof OmittedPipelineTableNames)[number],
  );

export const ActivePipelineTableNames = TableNames.filter(
  (tableName) => !isOmittedPipelineTable(tableName),
);

export const VoteResults = Object.freeze({
  Yes: "Jaa",
  No: "Ei",
  Absent: "Poissa",
} as const);

export const LanguageIds = Object.freeze({
  Finnish: "1",
  Swedish: "2",
} as const);

export const getProjectRoot = () => {
  return path.join(import.meta.dirname, "../../..");
};
