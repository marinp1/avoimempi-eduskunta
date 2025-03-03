import type { RepresentativeData } from "./MemberOfParliament.mts";

declare global {
  namespace Modules.Parser {
    export type MemberOfParliament = RepresentativeData;
  }
}
