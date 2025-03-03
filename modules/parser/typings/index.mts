import type { RepresentativeData } from "../types/MemberOfParliament.mts";

declare global {
  namespace Modules.Parser {
    export type MemberOfParliament = RepresentativeData;
  }
}
