import type { TableNames } from "#constants/TableNames.mts";

export type TableName = (typeof TableNames)[number];

/**
 * Each API response should include the following data.
 */
export type ApiResponse = {
  /** Current page number. */
  page: number;
  /** Number of data entries received in each response. */
  perPage: number;
  /** If next page contains data */
  hasMore: boolean;
  /** Name of the data table. */
  tableName: TableName;
  /** List of column names. */
  columnNames: string[];
  /**
   * Data is a two-dimensional array.
   * Length of this array should match @see {ApiResponse.rowCount} attribute.
   * Each array value should also be an array, which contains @see {ApiResponse.columnCount} entries.
   * Each entry therein corresponds to the matching index in the @see {ApiResponse.columnNames} attribute.
   */
  rowData: unknown[][];
  /** Number of columns in the response. */
  columnCount: number;
  /** Number of rows in the response. */
  rowCount: number;
  /** Which column in @see {ApiResponse.columnNames} is the primary key of the table. */
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
