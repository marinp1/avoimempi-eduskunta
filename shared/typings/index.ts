import type { TableNames } from "../constants/TableNames.ts";

declare global {
  namespace Modules.Common {
    export type TableName = (typeof TableNames)[number];
  }
}
