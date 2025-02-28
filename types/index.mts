import type { TableNames } from "#constants/TableNames.mts";

export type TableName = (typeof TableNames)[number];

export type ApiResponse = {
  page: number;
  perPage: number;
  hasMore: boolean;
  tableName: TableName;
  columnNames: string[];
  rowData: unknown[][];
  columnCount: number;
  rowCount: number;
  pkName: string;
};

type XmlElementNode<T extends string = string> = {
  type: "element";
  name: T;
};

type XmlTextNode = {
  type: "text";
  text: string;
};

export type XmlNode = (XmlElementNode | XmlTextNode) & {
  attributes?: Record<string, string>;
  elements?: Array<XmlNode>;
};

export type XmlTree = {
  elements: Array<XmlNode>;
};
