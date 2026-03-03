import type { Database } from "bun:sqlite";
import * as MemberOfParliament from "./fn/MemberOfParliament";
import * as SaliDBAanestys from "./fn/SaliDBAanestys";
import * as SaliDBAanestysAsiakirja from "./fn/SaliDBAanestysAsiakirja";
import * as SaliDBAanestysEdustaja from "./fn/SaliDBAanestysEdustaja";
import * as SaliDBIstunto from "./fn/SaliDBIstunto";
import * as SaliDBKohta from "./fn/SaliDBKohta";
import * as SaliDBKohtaAanestys from "./fn/SaliDBKohtaAanestys";
import * as SaliDBKohtaAsiakirja from "./fn/SaliDBKohtaAsiakirja";
import * as SaliDBPuheenvuoro from "./fn/SaliDBPuheenvuoro";
import * as SaliDBTiedote from "./fn/SaliDBTiedote";

export interface TableMigratorModule {
  default: (db: Database) => (data: any) => void | Promise<void>;
  flushVotes?: () => void | Promise<void>;
}

export const TABLE_MIGRATORS: Record<string, TableMigratorModule> = {
  MemberOfParliament,
  SaliDBAanestys,
  SaliDBAanestysAsiakirja,
  SaliDBAanestysEdustaja,
  SaliDBIstunto,
  SaliDBKohta,
  SaliDBKohtaAanestys,
  SaliDBKohtaAsiakirja,
  SaliDBPuheenvuoro,
  SaliDBTiedote,
};
