import path from "path";

export const TableName = Object.freeze({
  Attachment: "Attachment",
  AttachmentGroup: "AttachmentGroup",
  ExcelSpeeches: "ExcelSpeeches",
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

export const PrimaryKeys: Record<keyof typeof TableName, string> = {
  Attachment: "",
  AttachmentGroup: "",
  ExcelSpeeches: "id",
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

export const TableNames = [
  "Attachment",
  "AttachmentGroup",
  "ExcelSpeeches",
  "HetekaData",
  "MemberOfParliament",
  "PrimaryKeys",
  "SaliDBAanestys",
  "SaliDBAanestysAsiakirja",
  "SaliDBAanestysEdustaja",
  "SaliDBAanestysJakauma",
  "SaliDBAanestysKieli",
  "SaliDBIstunto",
  "SaliDBKohta",
  "SaliDBKohtaAanestys",
  "SaliDBKohtaAsiakirja",
  "SaliDBMessageLog",
  "SaliDBPuheenvuoro",
  "SaliDBTiedote",
  "SeatingOfParliament",
  "VaskiData",
] as const;

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
