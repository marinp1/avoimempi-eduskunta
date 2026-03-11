import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const VASKI_MIGRATOR_PATH = join(
  import.meta.dirname,
  "../migrator/fn/VaskiData/migrator.ts",
);
const SUBMIGRATORS_DIR = join(
  import.meta.dirname,
  "../migrator/fn/VaskiData/submigrators",
);
const NIMENHUUTORAPORTTI_PATH = join(
  import.meta.dirname,
  "../migrator/fn/VaskiData/submigrators/nimenhuutoraportti.ts",
);
const POYTAKIRJA_PATH = join(
  import.meta.dirname,
  "../migrator/fn/VaskiData/submigrators/pöytäkirja.ts",
);

describe("Migrator SQL pattern regressions", () => {
  test("VaskiDocument upsert has no SQL-side TRIM/CASE merge logic", () => {
    const source = readFileSync(VASKI_MIGRATOR_PATH, "utf8");
    expect(source).not.toMatch(/TRIM\s*\(\s*excluded\.edk_identifier\s*\)/);
    expect(source).not.toMatch(
      /CASE\s+WHEN\s+excluded\.edk_identifier[\s\S]*?END/,
    );
  });

  test("submigrators avoid post-upsert SELECT id round-trips", () => {
    const files = readdirSync(SUBMIGRATORS_DIR).filter((file) =>
      file.endsWith(".ts"),
    );

    for (const file of files) {
      const source = readFileSync(join(SUBMIGRATORS_DIR, file), "utf8");
      // vastaus_kirjalliseen_kysymykseen.ts legitimately looks up WrittenQuestion.id
      // by parliament_identifier as a cross-table FK lookup — this is not the
      // post-upsert round-trip anti-pattern this test guards against.
      if (file === "vastaus_kirjalliseen_kysymykseen.ts") continue;
      expect(source).not.toMatch(
        /SELECT id FROM [A-Za-z]+ WHERE parliament_identifier = \? LIMIT 1/,
      );
    }
  });

  test("roll call migrator does not run INSERT INTO RollCallEntry inside loops via db.run", () => {
    const source = readFileSync(NIMENHUUTORAPORTTI_PATH, "utf8");
    expect(source).not.toMatch(/db\.run\(\s*"INSERT INTO RollCallEntry\s*\(/);
  });

  test("minutes section resolver does not order by key and limits ambiguity checks", () => {
    const source = readFileSync(POYTAKIRJA_PATH, "utf8");
    expect(source).not.toMatch(
      /SELECT key FROM Section WHERE session_key = \? AND vaski_id = \? ORDER BY key/,
    );
    expect(source).toMatch(
      /SELECT key FROM Section WHERE session_key = \? AND vaski_id = \? LIMIT 2/,
    );
  });

  test("minutes speech resolver avoids COALESCE(created_datetime,'') ordering", () => {
    const source = readFileSync(POYTAKIRJA_PATH, "utf8");
    expect(source).not.toMatch(
      /ORDER BY COALESCE\(created_datetime, ''\) DESC, id DESC/,
    );
  });
});
