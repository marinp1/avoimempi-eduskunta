import { xml2json } from "xml-js";

type DataModel = RawDataModel<"VaskiData">;

const parseXml = (data: string) => {
  const parsedXml = xml2json(data, {
    ignoreDeclaration: true,
    alwaysArray: true,
    alwaysChildren: true,
    trim: true,
  });
  return parsedXml;
};

export default async (
  row: DataModel,
  primaryKey: keyof DataModel
): Promise<[primaryKey: string, data: Partial<DataModel>]> => {
  const response: Partial<DataModel> = {
    ...row,
    XmlData: parseXml(row.XmlData),
  };
  return Promise.resolve([`vaskidata_${primaryKey}`, response]);
};
