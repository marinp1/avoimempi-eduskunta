import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import {
  BLOCK_PROFILES,
  DOC_SUBKIND_PROFILES,
  PAGE_PROFILES,
  buildPartContext,
  findBlockResult,
  resolvePageProfile,
} from "../src/client/ai-summary-content";

function dom(html: string): HTMLElement {
  const window = new Window();
  window.document.body.innerHTML = html;
  return window.document.body as unknown as HTMLElement;
}

function q(scope: HTMLElement, selector: string): HTMLElement {
  const el = scope.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`fixture is missing ${selector}`);
  return el;
}

const LONG_PARA = (label: string) =>
  `${label} on riittävän pitkä kappale, jotta se ylittää keräyksen vähimmäispituuden selvästi.`;

describe("kirjallinen kysymys (kk) parts", () => {
  const KK_FIXTURE = `
    <div class="wrap">
      <h1>Kirjallinen kysymys sairaalaverkon tulevaisuudesta</h1>
    </div>
    <div class="doc-body wrap">
      <article class="article" id="kysymys">
        <div class="article__phase">Perustelut
          <button class="js-ai-block" data-ai-kind="doc-section"></button>
        </div>
        <div class="section__ai-result js-ai-block-result" hidden>
          <p class="js-ai-block-text">Aiemmin generoitu tiivistelmä, jonka ei pidä päätyä aineistoon koskaan.</p>
        </div>
        <p class="standfirst">${LONG_PARA("Kysymyksen ensimmäinen kappale")}</p>
        <p>${LONG_PARA("Kysymyksen toinen kappale")}</p>
        <div id="vastaus">
          <div class="article__phase">Vastaus kirjalliseen kysymykseen</div>
          <p class="standfirst">${LONG_PARA("Ministerin vastauksen ensimmäinen kappale")}</p>
          <p>${LONG_PARA("Ministerin vastauksen toinen kappale")}</p>
        </div>
      </article>
    </div>`;

  test("returns separate question and answer parts", () => {
    const scope = dom(KK_FIXTURE);
    const parts = DOC_SUBKIND_PROFILES["kk"]!.collectParts(scope, scope);

    expect(parts).toHaveLength(2);
    expect(parts[0]!.heading).toBe("Kysymys");
    expect(parts[1]!.heading).toBe("Ministerin vastaus");
  });

  test("question part contains question text but no answer text", () => {
    const scope = dom(KK_FIXTURE);
    const [question] = DOC_SUBKIND_PROFILES["kk"]!.collectParts(scope, scope);

    expect(question!.text).toContain("Kysymyksen ensimmäinen kappale");
    expect(question!.text).toContain("Kysymyksen toinen kappale");
    expect(question!.text).not.toContain("Ministerin vastauksen");
  });

  test("answer part contains answer text but no question text", () => {
    const scope = dom(KK_FIXTURE);
    const [, answer] = DOC_SUBKIND_PROFILES["kk"]!.collectParts(scope, scope);

    expect(answer!.text).toContain("Ministerin vastauksen ensimmäinen kappale");
    expect(answer!.text).not.toContain("Kysymyksen ensimmäinen kappale");
  });

  test("both parts carry the document title and labeled body", () => {
    const scope = dom(KK_FIXTURE);
    const parts = DOC_SUBKIND_PROFILES["kk"]!.collectParts(scope, scope);

    for (const part of parts) {
      expect(part.text).toContain(
        "Kirjallinen kysymys sairaalaverkon tulevaisuudesta",
      );
    }
    expect(parts[0]!.text).toContain("Kysymyksen teksti:");
    expect(parts[1]!.text).toContain("Ministerin vastaus:");
  });

  test("parts have distinct instructions for question and answer", () => {
    const scope = dom(KK_FIXTURE);
    const [question, answer] = DOC_SUBKIND_PROFILES["kk"]!.collectParts(
      scope,
      scope,
    );

    expect(question!.instruction).not.toBe(answer!.instruction);
    expect(question!.instruction).toContain("kysy");
    expect(answer!.instruction).toContain("vastau");
  });

  test("previously generated block summaries are never collected", () => {
    const scope = dom(KK_FIXTURE);
    const parts = DOC_SUBKIND_PROFILES["kk"]!.collectParts(scope, scope);

    for (const part of parts) {
      expect(part.text).not.toContain("Aiemmin generoitu tiivistelmä");
    }
  });

  test("returns only the question part when there is no answer", () => {
    const scope = dom(
      KK_FIXTURE.replace(
        /<div id="vastaus">[\s\S]*?<\/div>\s*<\/article>/,
        "</article>",
      ),
    );
    const parts = DOC_SUBKIND_PROFILES["kk"]!.collectParts(scope, scope);

    expect(parts).toHaveLength(1);
    expect(parts[0]!.heading).toBe("Kysymys");
  });
});

describe("speech block", () => {
  const SPEECH_FIXTURE = `
    <div class="wrap">
      <div class="transcript" id="transcript">
        <article class="speech">
          <div class="speech__main">
            <div class="speech__head">
              <span class="speech__name">Maija Meikäläinen</span>
              <span class="tag">kok</span>
              <span class="speech__role">Ryhmäpuheenvuoro</span>
            </div>
            <div class="speech__sum js-ai-block-result" hidden>
              <p class="js-ai-block-text"></p>
            </div>
            <div class="speech__body"><p>${LONG_PARA("Puheenvuoron sisältö")}</p></div>
            <div class="speech__foot">
              <button class="js-ai-block" data-ai-kind="speech"
                data-ai-context="Keskustelu sairaalaverkosta"></button>
            </div>
          </div>
        </article>
      </div>
    </div>`;

  test("collects speaker, party and speech body as labeled input", () => {
    const scope = dom(SPEECH_FIXTURE);
    const btn = q(scope, ".js-ai-block");
    const parts = BLOCK_PROFILES["speech"]!.collectParts(scope, btn);

    expect(parts).toHaveLength(1);
    expect(parts[0]!.text).toContain("Puhuja: Maija Meikäläinen (kok)");
    expect(parts[0]!.text).toContain("Puheenvuoro:");
    expect(parts[0]!.text).toContain("Puheenvuoron sisältö");
  });

  test("topic context is delivered via the context channel, not the input", () => {
    const scope = dom(SPEECH_FIXTURE);
    const btn = q(scope, ".js-ai-block");
    const [part] = BLOCK_PROFILES["speech"]!.collectParts(scope, btn);

    const context = buildPartContext(
      part!.instruction,
      BLOCK_PROFILES["speech"]!.contextLabel,
      btn.dataset.aiContext ?? "",
    );
    expect(context).toContain("Keskustelun aihe: Keskustelu sairaalaverkosta");
    expect(part!.text).not.toContain("Keskustelun aihe");
  });
});

describe("debate page", () => {
  const DEBATE_FIXTURE = `
    <div class="wrap">
      <div class="js-ai-summary" data-ai-kind="debate"></div>
      <div class="transcript" id="transcript">
        <article class="speech">
          <div class="speech__head">
            <span class="speech__name">Maija Meikäläinen</span>
            <span class="tag">kok</span>
            <span class="speech__role">Ryhmäpuheenvuoro</span>
          </div>
          <div class="speech__body"><p>${LONG_PARA("Ryhmäpuheenvuoron sisältö")}</p></div>
        </article>
        <article class="speech">
          <div class="speech__head">
            <span class="speech__name">Matti Vastaaja</span>
            <span class="tag">sd</span>
            <span class="speech__role reply">Vastauspuheenvuoro</span>
          </div>
          <div class="speech__body"><p>${LONG_PARA("Vastauspuheenvuoron sisältö")}</p></div>
        </article>
      </div>
    </div>`;

  test("collects group speeches with speaker and party, skips replies", () => {
    const scope = dom(DEBATE_FIXTURE);
    const el = q(scope, ".js-ai-summary");
    const parts = PAGE_PROFILES["debate"]!.collectParts(scope, el);

    expect(parts).toHaveLength(1);
    expect(parts[0]!.text).toContain("Puhuja: Maija Meikäläinen (kok)");
    expect(parts[0]!.text).toContain("Ryhmäpuheenvuoron sisältö");
    expect(parts[0]!.text).not.toContain("Vastauspuheenvuoron sisältö");
  });

  test("caps total input size and states how many speeches were omitted", () => {
    const speechCards = Array.from({ length: 20 }, (_, i) => {
      const body = `Puhuja numero ${i + 1} puhuu. ${"Pitkä virke täytteeksi, jotta puheenvuoro on aidosti pitkä. ".repeat(60)}`;
      return `
        <article class="speech">
          <div class="speech__head">
            <span class="speech__name">Edustaja ${i + 1}</span>
            <span class="tag">kok</span>
            <span class="speech__role">Ryhmäpuheenvuoro</span>
          </div>
          <div class="speech__body"><p>${body}</p></div>
        </article>`;
    }).join("");
    const scope = dom(
      `<div class="wrap">
        <div class="js-ai-summary" data-ai-kind="debate"></div>
        <div id="transcript">${speechCards}</div>
      </div>`,
    );
    const el = q(scope, ".js-ai-summary");
    const [part] = PAGE_PROFILES["debate"]!.collectParts(scope, el);

    expect(part!.text.length).toBeLessThan(14000);
    expect(part!.text).toContain("Puhuja: Edustaja 1");
    expect(part!.text).toMatch(/\d+ muuta ryhmäpuheenvuoroa/);
  });
});

describe("voting page", () => {
  const VOTING_FIXTURE = `
    <div class="wrap">
      <h1>Äänestys lakiesityksestä</h1>
      <section class="vresult">
        <div class="vresult__q">
          <span class="prop"><span class="k j">JAA</span> Mietintö</span>
          <span class="prop"><span class="k e">EI</span> Vastalause</span>
        </div>
        <div class="vote-legend">
          <div class="vl"><span class="vk">Jaa</span><span class="vv">101</span></div>
          <div class="vl"><span class="vk">Ei</span><span class="vv">80</span></div>
        </div>
        <div class="decision"><div class="t">Mietintö hyväksyttiin</div>
          <div class="t sub">Hallitus voitti</div></div>
      </section>
      <section id="ryhmat">
        <div class="pvote">
          <div class="pvote__name">Kokoomus</div>
          <div class="pvote__num"><b>40</b> jaa</div>
        </div>
        <div class="pvote">
          <div class="pvote__name">SDP</div>
          <div class="pvote__num"><b>35</b> ei</div>
        </div>
      </section>
      <div class="js-ai-summary" data-ai-kind="voting"></div>
    </div>`;

  test("collects proposals, totals, result and party breakdown", () => {
    const scope = dom(VOTING_FIXTURE);
    const el = q(scope, ".js-ai-summary");
    const parts = PAGE_PROFILES["voting"]!.collectParts(scope, el);

    expect(parts).toHaveLength(1);
    const text = parts[0]!.text;
    expect(text).toContain("Äänestyksen aihe: Äänestys lakiesityksestä");
    expect(text).toContain("Jaa: 101");
    expect(text).toContain("Ei: 80");
    expect(text).toContain("Tulos: Mietintö hyväksyttiin");
    expect(text).toContain("Kokoomus: 40 jaa");
    expect(text).toContain("SDP: 35 ei");
  });
});

describe("doc-section block", () => {
  const SECTION_FIXTURE = `
    <article class="article">
      <div class="article__phase">Perustelut
        <button class="js-ai-block" data-ai-kind="doc-section" data-ai-context="Perustelut"></button>
      </div>
      <div class="section__ai-result js-ai-block-result" hidden>
        <p class="js-ai-block-text">Vanha generoitu tiivistelmä tähän osioon.</p>
      </div>
      <p>${LONG_PARA("Osion ensimmäinen kappale")}</p>
      <blockquote class="rt-indent">${LONG_PARA("Sisennetty lainaus osiossa")}</blockquote>
      <div class="mt-28 pt-20 bt-rule">
        <h3>Allekirjoittajat</h3>
        <div class="signatory-list"><div class="signatory-row">Päivi Räsänen Ensimmäinen allekirjoittaja</div></div>
      </div>
      <div class="source-note"><span>Lähde</span><span class="dset">Eduskunnan avoin data</span></div>
      <div class="article__phase">Seuraava osio</div>
      <p>${LONG_PARA("Seuraavan osion kappale")}</p>
    </article>`;

  test("collects only the section's own paragraphs", () => {
    const scope = dom(SECTION_FIXTURE);
    const btn = q(scope, ".js-ai-block");
    const parts = BLOCK_PROFILES["doc-section"]!.collectParts(scope, btn);

    expect(parts).toHaveLength(1);
    expect(parts[0]!.text).toContain("Osio: Perustelut");
    expect(parts[0]!.text).toContain("Osion ensimmäinen kappale");
    expect(parts[0]!.text).toContain("Sisennetty lainaus osiossa");
    expect(parts[0]!.text).not.toContain("Seuraavan osion kappale");
    expect(parts[0]!.text).not.toContain("Vanha generoitu tiivistelmä");
  });

  test("signatory and source-note noise is never collected", () => {
    const scope = dom(SECTION_FIXTURE);
    const btn = q(scope, ".js-ai-block");
    const [part] = BLOCK_PROFILES["doc-section"]!.collectParts(scope, btn);

    expect(part!.text).not.toContain("Allekirjoittajat");
    expect(part!.text).not.toContain("Eduskunnan avoin data");
  });

  test("the ✦ trigger button text never leaks into the section heading", () => {
    const scope = dom(SECTION_FIXTURE);
    const btn = q(scope, ".js-ai-block");
    const [part] = BLOCK_PROFILES["doc-section"]!.collectParts(scope, btn);

    const headingLine = part!.text.split("\n")[0]!;
    expect(headingLine).toBe("Osio: Perustelut");
    expect(part!.text).not.toContain("✦");
  });
});

describe("findBlockResult", () => {
  const MULTI_SECTION_FIXTURE = `
    <article class="article">
      <div class="article__phase">Ensimmäinen osio
        <button id="btn1" class="js-ai-block" data-ai-kind="doc-section"></button>
      </div>
      <div id="result1" class="section__ai-result js-ai-block-result" hidden>
        <p class="js-ai-block-text"></p>
      </div>
      <p>${LONG_PARA("Ensimmäisen osion kappale")}</p>
      <div class="article__phase">Toinen osio
        <button id="btn2" class="js-ai-block" data-ai-kind="doc-section"></button>
      </div>
      <div id="result2" class="section__ai-result js-ai-block-result" hidden>
        <p class="js-ai-block-text"></p>
      </div>
      <h3>Vastaus
        <button id="btn3" class="js-ai-block" data-ai-kind="doc-section"></button>
      </h3>
      <div id="result3" class="section__ai-result js-ai-block-result" hidden>
        <p class="js-ai-block-text"></p>
      </div>
    </article>`;

  test("each section button targets its own result slot, not the first one", () => {
    const scope = dom(MULTI_SECTION_FIXTURE);
    expect(findBlockResult(q(scope, "#btn1"))?.id).toBe("result1");
    expect(findBlockResult(q(scope, "#btn2"))?.id).toBe("result2");
    expect(findBlockResult(q(scope, "#btn3"))?.id).toBe("result3");
  });

  test("a speech button targets the result slot inside its own speech card", () => {
    const scope = dom(`
      <div id="transcript">
        <article class="speech">
          <div id="resultA" class="js-ai-block-result" hidden></div>
          <button id="btnA" class="js-ai-block" data-ai-kind="speech"></button>
        </article>
        <article class="speech">
          <div id="resultB" class="js-ai-block-result" hidden></div>
          <button id="btnB" class="js-ai-block" data-ai-kind="speech"></button>
        </article>
      </div>`);
    expect(findBlockResult(q(scope, "#btnA"))?.id).toBe("resultA");
    expect(findBlockResult(q(scope, "#btnB"))?.id).toBe("resultB");
  });
});

describe("profile rigor", () => {
  const allProfiles = [
    ...Object.entries(PAGE_PROFILES),
    ...Object.entries(DOC_SUBKIND_PROFILES),
    ...Object.entries(BLOCK_PROFILES),
  ];

  test("every sharedContext demands Finnish output", () => {
    for (const [name, profile] of allProfiles) {
      expect(profile.sharedContext, name).toContain("suomeksi");
    }
  });

  test("every profile has a non-empty context label", () => {
    for (const [name, profile] of allProfiles) {
      expect(profile.contextLabel.length, name).toBeGreaterThan(0);
    }
  });

  test("resolvePageProfile dispatches document subkinds and rejects unknowns", () => {
    expect(resolvePageProfile("document", "kk")).toBe(
      DOC_SUBKIND_PROFILES["kk"]!,
    );
    expect(resolvePageProfile("document", "tuntematon")).toBeNull();
    expect(resolvePageProfile("voting", undefined)).toBe(
      PAGE_PROFILES["voting"]!,
    );
    expect(resolvePageProfile("eioo", undefined)).toBeNull();
  });

  test("buildPartContext joins instruction and labeled context", () => {
    expect(buildPartContext("Ohje.", "Aihe", "Sote-uudistus")).toBe(
      "Ohje.\n\nAihe: Sote-uudistus",
    );
    expect(buildPartContext("Ohje.", "Aihe", "")).toBe("Ohje.");
  });
});
