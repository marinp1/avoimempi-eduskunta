import type { Database } from "bun:sqlite";
import * as MemberOfParliament from "./MemberOfParliament/migrator";
import * as SaliDBAanestys from "./SaliDBAanestys/migrator";
import * as SaliDBAanestysAsiakirja from "./SaliDBAanestysAsiakirja/migrator";
import * as SaliDBAanestysEdustaja from "./SaliDBAanestysEdustaja/migrator";
import * as SaliDBIstunto from "./SaliDBIstunto/migrator";
import * as SaliDBKohta from "./SaliDBKohta/migrator";
import * as SaliDBKohtaAanestys from "./SaliDBKohtaAanestys/migrator";
import * as SaliDBKohtaAsiakirja from "./SaliDBKohtaAsiakirja/migrator";
import * as SaliDBPuheenvuoro from "./SaliDBPuheenvuoro/migrator";
import * as SaliDBTiedote from "./SaliDBTiedote/migrator";

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
