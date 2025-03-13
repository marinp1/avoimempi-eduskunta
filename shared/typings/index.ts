import type {
  TableNames,
  VoteResults,
  LanguageIds,
} from "../constants/TableNames.ts";

declare global {
  namespace Modules.Common {
    export type TableName = (typeof TableNames)[number];
    export type VoteResult = (typeof VoteResults)[keyof typeof VoteResults];
    export type LanguageId = (typeof LanguageIds)[keyof typeof LanguageIds];
  }
}
