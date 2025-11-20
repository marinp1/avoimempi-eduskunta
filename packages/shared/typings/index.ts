import type {
  LanguageIds,
  TableNames,
  VoteResults,
} from "../constants/index.ts";

declare global {
  namespace Modules.Common {
    export type DateString = string;
    export type TableName = (typeof TableNames)[number];
    export type VoteResult = (typeof VoteResults)[keyof typeof VoteResults];
    export type LanguageId = (typeof LanguageIds)[keyof typeof LanguageIds];
  }
}
