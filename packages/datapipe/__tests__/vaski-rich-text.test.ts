import { describe, expect, test } from "bun:test";
import { parseRichTextDocument } from "../../shared/typings/RichText";
import { convertVaskiNodeToRichText } from "../migrator/VaskiData/rich-text";

describe("Vaski rich text conversion", () => {
  test("converts formatted Vaski nodes into AST and plain text", () => {
    const sourceNode = {
      LihavaKursiiviOtsikkoTeksti: "Päätös",
      KappaleKooste: {
        AsiakirjaViiteTunnus: "HE 77/2017 vp",
        "#text": "Hallituksen esitys eduskunnalle.",
      },
      PaatosToimenpide: {
        JohdantoTeksti: "Hallintovaliokunta esittää,",
        SisennettyKappaleKooste: {
          KursiiviTeksti: "että maa- ja metsätalousvaliokunta ottaa edellä olevan huomioon",
          "#text": ".",
        },
      },
      SaadosKappaleKooste: [
        {
          SaadosKursiiviKooste: "muutetaan",
          "#text": "valtion virkamieslain 53 §",
        },
      ],
    };

    const converted = convertVaskiNodeToRichText(sourceNode);

    expect(converted.document).not.toBeNull();
    expect(converted.json).not.toBeNull();
    expect(converted.plainText).toContain("Hallintovaliokunta esittää,");
    expect(converted.plainText).toContain(
      "muutetaan valtion virkamieslain 53 §",
    );

    const parsed = parseRichTextDocument(converted.json);
    expect(parsed).not.toBeNull();
    expect(parsed?.blocks[0]?.type).toBe("heading");

    const paragraph = parsed?.blocks.find((block) => block.type === "paragraph");
    expect(paragraph?.type).toBe("paragraph");
    if (paragraph?.type === "paragraph") {
      const inlineWithReference = paragraph.inlines.find(
        (inline) => inline.type === "text" && inline.reference?.identifier === "HE 77/2017 vp",
      );
      expect(inlineWithReference).toBeTruthy();
    }
  });

  test("returns empty payload for empty values", () => {
    const converted = convertVaskiNodeToRichText(undefined);
    expect(converted.document).toBeNull();
    expect(converted.json).toBeNull();
    expect(converted.plainText).toBeNull();
  });
});

