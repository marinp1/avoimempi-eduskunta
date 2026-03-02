import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { StorageFactory } from "#storage";
import { resetRowStores } from "#storage/row-store/factory";
import { SqliteRowStore } from "#storage/row-store/providers/sqlite";
import parser, { onParsingComplete } from "../parser/fn/VaskiData";

async function withTempWorkspace(fn: (workspace: string) => Promise<void>) {
  const originalCwd = process.cwd();
  const originalStorageProvider = process.env.STORAGE_PROVIDER;
  const originalStorageLocalDir = process.env.STORAGE_LOCAL_DIR;
  const workspace = await mkdtemp(path.join(tmpdir(), "vaski-parser-"));

  try {
    process.chdir(workspace);
    process.env.STORAGE_PROVIDER = "local";
    process.env.STORAGE_LOCAL_DIR = path.join(workspace, "data");
    StorageFactory.reset();
    resetRowStores();
    await fn(workspace);
  } finally {
    process.chdir(originalCwd);
    StorageFactory.reset();
    resetRowStores();

    if (originalStorageProvider === undefined) {
      delete process.env.STORAGE_PROVIDER;
    } else {
      process.env.STORAGE_PROVIDER = originalStorageProvider;
    }

    if (originalStorageLocalDir === undefined) {
      delete process.env.STORAGE_LOCAL_DIR;
    } else {
      process.env.STORAGE_LOCAL_DIR = originalStorageLocalDir;
    }

    await rm(workspace, { recursive: true, force: true });
  }
}

describe("VaskiData parser", () => {
  test("extracts rootType for structured documents", async () => {
    const row = {
      Id: "1",
      Eduskuntatunnus: "PTK 1/2025 vp",
      Status: "5",
      Created: "2025-01-01T10:00:00",
      AttachmentGroupId: null,
      XmlData: `
<Siirto>
  <SiirtoMetatieto kieliKoodi="fi">
    <JulkaisuMetatieto kieliKoodi="fi" />
  </SiirtoMetatieto>
  <SiirtoAsiakirja>
    <RakenneAsiakirja>
      <Poytakirja />
    </RakenneAsiakirja>
  </SiirtoAsiakirja>
</Siirto>`,
    };

    const [, parsed] = await parser(row, "Id");
    expect(parsed.rootType).toBe("Poytakirja");
  });

  test("marks swedish entries with _skip", async () => {
    const row = {
      Id: "2",
      Eduskuntatunnus: "PTK 1/2025 vp",
      Status: "5",
      Created: "2025-01-01T10:00:00",
      AttachmentGroupId: null,
      XmlData: `
<Siirto>
  <SiirtoMetatieto kieliKoodi="sv">
    <JulkaisuMetatieto kieliKoodi="sv" />
  </SiirtoMetatieto>
  <Sanomavalitys>
    <SanomatyyppiNimi>PTK_sv</SanomatyyppiNimi>
  </Sanomavalitys>
</Siirto>`,
    };

    const [, parsed] = await parser(row, "Id");
    expect(parsed._skip).toBe(true);
  });

  test("onParsingComplete rebuilds full index from parsed row store and writes index.json", async () => {
    await withTempWorkspace(async (workspace) => {
      const dataDir = path.join(workspace, "data");
      await mkdir(dataDir, { recursive: true });

      // Seed the parsed row store directly
      const parsedStore = new SqliteRowStore(
        path.join(dataDir, "parsed.db"),
        "parsed",
      );
      await parsedStore.upsertBatch(
        "VaskiData",
        "Id",
        [],
        [
          {
            pk: 3,
            data: JSON.stringify({
              id: "3",
              "#avoimempieduskunta": { documentType: "hallituksen_esitys" },
            }),
          },
          {
            pk: 4,
            data: JSON.stringify({
              id: "4",
              "#avoimempieduskunta": { documentType: "nimenhuutoraportti" },
            }),
          },
          {
            pk: 1,
            data: JSON.stringify({
              id: "1",
              "#avoimempieduskunta": { documentType: "nimenhuutoraportti" },
            }),
          },
          {
            pk: 2,
            data: JSON.stringify({
              id: "2",
              _skip: true,
              "#avoimempieduskunta": { documentType: "nimenhuutoraportti" },
            }),
          },
        ],
      );
      parsedStore.close();

      await onParsingComplete();

      const indexPath = path.join(workspace, "vaski-data", "index.json");
      const indexRaw = await readFile(indexPath, "utf-8");
      const index = JSON.parse(indexRaw);
      expect(index).toEqual({
        hallituksen_esitys: { totalRecords: 1 },
        nimenhuutoraportti: { totalRecords: 2 },
      });
    });
  });
});
