import type { TableNames } from "avoimempi-eduskunta-common/constants/TableNames.mts";

declare global {
  namespace Modules.Common {
    export type TableName = (typeof TableNames)[number];
  }
}
