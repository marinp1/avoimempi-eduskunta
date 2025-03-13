import { TableName } from "#constants/TableNames";

interface RawDataModels {
  [TableName.MemberOfParliament]: {
    personId: number;
    XmlData: string;
    XmlDataEn: string;
    XmlDataFi: string;
    XmlDataSv: string;
    firstname: string;
    lastname: string;
    minister: string;
    party: string;
  };
}

export type RawDataModel<T extends Modules.Common.TableName> =
  T extends keyof RawDataModels ? RawDataModels[T] : Record<string, unknown>;
