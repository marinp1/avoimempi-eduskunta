import type { XmlTree } from "parser/types";
import { XMLParser } from "fast-xml-parser";

type DataModel = RawDataModel<"VaskiData">;

const parser = new XMLParser({
  ignoreAttributes: [/^xmlns/],
  allowBooleanAttributes: true,
  trimValues: true,
  parseAttributeValue: true,
});

const cleanUpObject = (data: Record<string, any>) => {
  for (const key in data) {
    if (key === "fra:FraasiOhjaustieto" && Array.isArray(data[key])) {
      data[key] = data[key].reduce((acc: Record<string, any>, item: any) => {
        if (item["@_fra1:fraasiOminaisuusTeksti"] in acc)
          throw new Error("Duplicate key");
        acc[item["@_fra1:fraasiOminaisuusTeksti"]] =
          item["fra1:FraasiArvoTeksti"];
        return acc;
      }, {});
    } else if (typeof data[key] === "object") {
      cleanUpObject(data[key]);
    }
  }
};

const parseXml = (data: string) => {
  const parsed = parser.parse(data);
  cleanUpObject(parsed);
  return parsed;
};

export default async (
  row: DataModel,
  primaryKey: keyof DataModel
): Promise<
  [
    primaryKey: string,
    data: {
      [x in keyof DataModel]?: any;
    }
  ]
> => {
  const response: {
    [x in keyof DataModel]?: any;
  } = {
    ...row,
    XmlData: parseXml(row.XmlData),
  };
  return Promise.resolve([`vaskidata_${row[primaryKey]}`, response]);
};
