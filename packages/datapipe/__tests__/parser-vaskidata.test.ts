import { describe, expect, test } from "bun:test";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { StorageFactory } from "#storage";
import parser, {
  onPageParsed,
  onParsingComplete,
} from "../parser/fn/VaskiData";

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
    await fn(workspace);
  } finally {
    process.chdir(originalCwd);
    StorageFactory.reset();

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

  test("onParsingComplete rebuilds full index from parsed storage and writes symlinks", async () => {
    await withTempWorkspace(async (workspace) => {
      const parsedDir = path.join(workspace, "data", "parsed", "VaskiData");
      await mkdir(parsedDir, { recursive: true });

      // Files use PK-range naming: page_{firstPk}+{lastPk}.json (12-digit zero-padded)
      const pageA = {
        rowData: [
          {
            id: "3",
            "#avoimempieduskunta": { documentType: "hallituksen_esitys" },
          },
          {
            id: "4",
            "#avoimempieduskunta": { documentType: "nimenhuutoraportti" },
          },
        ],
      };
      const pageB = {
        rowData: [
          {
            id: "1",
            "#avoimempieduskunta": { documentType: "nimenhuutoraportti" },
          },
          {
            id: "2",
            _skip: true,
            "#avoimempieduskunta": { documentType: "nimenhuutoraportti" },
          },
        ],
      };

      const pageAFilename = "page_000000000003+000000000004.json";
      const pageBFilename = "page_000000000001+000000000002.json";
      const pageAKey = `parsed/VaskiData/${pageAFilename}`;
      const pageBKey = `parsed/VaskiData/${pageBFilename}`;

      await writeFile(
        path.join(parsedDir, pageAFilename),
        JSON.stringify(pageA, null, 2),
      );
      await writeFile(
        path.join(parsedDir, pageBFilename),
        JSON.stringify(pageB, null, 2),
      );

      await onParsingComplete();

      const indexPath = path.join(workspace, "vaski-data", "index.json");
      const indexRaw = await readFile(indexPath, "utf-8");
      const index = JSON.parse(indexRaw);
      expect(index).toEqual({
        hallituksen_esitys: {
          totalRecords: 1,
          pages: {
            [pageAKey]: ["3"],
          },
        },
        nimenhuutoraportti: {
          totalRecords: 2,
          pages: {
            [pageBKey]: ["1"],
            [pageAKey]: ["4"],
          },
        },
      });

      const symlinkPath = path.join(
        workspace,
        "vaski-data",
        "nimenhuutoraportti",
        pageBFilename,
      );
      const linkStats = await lstat(symlinkPath);
      expect(linkStats.isSymbolicLink()).toBe(true);

      const symlinkTarget = await readlink(symlinkPath);
      expect(symlinkTarget).toBe(`../../data/parsed/VaskiData/${pageBFilename}`);
    });
  });

  test("onPageParsed creates per-document-type symlink for parsed page", async () => {
    await withTempWorkspace(async (workspace) => {
      const storageKey = "parsed/VaskiData/page_000000000042+000000000042.json";
      await onPageParsed(storageKey, [
        {
          id: "1001",
          "#avoimempieduskunta": { documentType: "nimenhuutoraportti" },
        },
      ]);

      const filename = "page_000000000042+000000000042.json";
      const symlinkPath = path.join(
        workspace,
        "vaski-data",
        "nimenhuutoraportti",
        filename,
      );
      const linkStats = await lstat(symlinkPath);
      expect(linkStats.isSymbolicLink()).toBe(true);

      const symlinkTarget = await readlink(symlinkPath);
      expect(symlinkTarget).toBe(`../../data/parsed/VaskiData/${filename}`);
    });
  });
});
