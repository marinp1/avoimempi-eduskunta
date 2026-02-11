import { describe, expect, test } from "bun:test";
import parser from "../parser/fn/VaskiData";

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
});
