// Pure content layer for the AI summary island: per-data-type summary profiles
// (Summarizer session options + rigorous Finnish instructions) and DOM
// collectors that turn the current page into clearly labeled summariser input.
// No document/global access — everything takes an explicit scope so the
// collectors are unit-testable against fixture DOM.

export interface SummaryPart {
  /** Rendered above the part's output when a summary has multiple parts. */
  heading: string | null;
  /** Rigorous per-part task instruction, passed as the per-call context. */
  instruction: string;
  /** The labeled input text to summarise. */
  text: string;
}

export interface SummaryProfile {
  type: SummarizerType;
  length: SummarizerLength;
  /** Finnish framing of the data type, set at session creation. */
  sharedContext: string;
  /** Label for the element's data-ai-context value in the per-call context. */
  contextLabel: string;
  collectParts: (scope: HTMLElement, el: HTMLElement) => SummaryPart[];
}

const ALWAYS_FINNISH =
  "Kirjoita AINA suomeksi, vaikka aineistossa olisi muunkielisiä osia. Älä lisää tietoja, joita aineistossa ei ole.";

export function buildPartContext(
  instruction: string,
  contextLabel: string,
  rawContext: string,
): string {
  if (rawContext) {
    return `${instruction}\n\n${contextLabel}: ${rawContext}`;
  }
  return instruction;
}

// ─── Collection helpers ───────────────────────────────────────────────────────

function wrapOf(scope: HTMLElement, el: HTMLElement): HTMLElement {
  return el.closest<HTMLElement>(".wrap") ?? scope;
}

function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

/**
 * Collects paragraph texts under a container, always skipping previously
 * generated AI summaries (`.js-ai-block-result`) and optionally anything
 * matched by `exclude`.
 */
function paragraphTexts(
  container: HTMLElement | null,
  minLen: number,
  exclude?: (p: HTMLElement) => boolean,
): string[] {
  if (!container) return [];
  const texts: string[] = [];
  for (const p of container.querySelectorAll<HTMLElement>("p")) {
    if (p.closest(".js-ai-block-result")) continue;
    if (exclude?.(p)) continue;
    const text = p.textContent?.trim();
    if (text && text.length > minLen) texts.push(text);
  }
  return texts;
}

function headingOf(scope: HTMLElement): string {
  return scope.querySelector<HTMLElement>("h1")?.textContent?.trim() ?? "";
}

/**
 * Heading text of an `.article__phase` element, excluding the ✦ trigger
 * button (and any other child elements) embedded in it.
 */
function phaseHeading(phase: HTMLElement): string {
  let text = "";
  for (const node of phase.childNodes) {
    if (node.nodeType === 3) text += node.textContent ?? "";
  }
  return text.trim();
}

function singlePart(instruction: string, text: string): SummaryPart[] {
  if (!text) return [];
  return [{ heading: null, instruction, text }];
}

/**
 * Tags that carry actual document prose. Sibling walkers only collect these,
 * so structural noise (signatory lists, source notes, link toolbars — all
 * rendered as divs) never ends up in the summariser input.
 */
const CONTENT_TAGS = new Set(["P", "BLOCKQUOTE", "UL", "OL", "TABLE"]);

function contentNodeText(node: Element, minLen: number): string | null {
  if (!CONTENT_TAGS.has(node.tagName)) return null;
  if (node.closest(".js-ai-block-result")) return null;
  const text = node.textContent?.trim();
  return text && text.length > minLen ? text : null;
}

// ─── Page profiles ────────────────────────────────────────────────────────────
// Content-rich kinds use key-points/long (lead + bullets); thin structured
// kinds use tldr/long (verbose interpretive prose).

export const PAGE_PROFILES: Record<string, SummaryProfile> = {
  debate: {
    type: "key-points",
    length: "long",
    sharedContext:
      "Aineisto on Suomen eduskunnan täysistunnon keskustelu: eduskuntaryhmien ryhmäpuheenvuorot puhujineen ja puolueineen. Tuota kooste aina suomeksi.",
    contextLabel: "Keskustelun aihe",
    collectParts: (scope, el) =>
      singlePart(
        `Tehtävä: Laadi kattava suomenkielinen kooste eduskunnan täysistuntokeskustelusta. Kerro mistä asiasta keskusteltiin, kunkin eduskuntaryhmän keskeinen kanta omana kohtanaan ja mistä ryhmät olivat eri mieltä. Mainitse ryhmät ja puhujat nimeltä. ${ALWAYS_FINNISH}`,
        collectDebateText(wrapOf(scope, el)),
      ),
  },
  voting: {
    type: "tldr",
    length: "long",
    sharedContext:
      "Aineisto on Suomen eduskunnan täysistuntoäänestyksen tulos: ehdotukset, äänimäärät (jaa, ei, tyhjiä, poissa) ja eduskuntaryhmien äänijakauma. Tuota kooste aina suomeksi.",
    contextLabel: "Äänestyksen aihe",
    collectParts: (scope, el) =>
      singlePart(
        `Tehtävä: Selitä suomeksi ja perusteellisesti, mitä tämä eduskunnan äänestystulos tarkoittaa. Kerro mistä äänestettiin, mitkä olivat vastakkaiset ehdotukset, miten äänet jakautuivat ja mikä oli lopputulos. Kuvaa myös, miten eduskuntaryhmät äänestivät ja erosiko jokin ryhmä linjasta. Kirjoita kokonaisin virkkein. ${ALWAYS_FINNISH}`,
        collectVotingText(wrapOf(scope, el)),
      ),
  },
  session: {
    type: "key-points",
    length: "long",
    sharedContext:
      "Aineisto on Suomen eduskunnan täysistunnon asialista: päätösasiat, joista äänestettiin, ja keskusteluasiat. Tuota kooste aina suomeksi.",
    contextLabel: "Istunto",
    collectParts: (scope, el) =>
      singlePart(
        `Tehtävä: Laadi kattava suomenkielinen kooste eduskunnan täysistunnosta. Kerro mitä asioita istunnossa käsiteltiin: mistä äänestettiin ja mistä keskusteltiin. Ryhmittele keskeiset asiat omiksi kohdikseen. ${ALWAYS_FINNISH}`,
        collectSessionText(scope, el),
      ),
  },
  home: {
    type: "key-points",
    length: "long",
    sharedContext:
      "Aineisto on yhteenveto Suomen eduskunnan tuoreimmasta istuntopäivästä: tiukimmat äänestykset tuloksineen ja eniten puheenvuoroja pitäneet kansanedustajat. Tuota kooste aina suomeksi.",
    contextLabel: "Päivämäärä",
    collectParts: (scope) =>
      singlePart(
        `Tehtävä: Laadi kattava suomenkielinen kooste eduskunnan istuntopäivästä. Kerro päivän merkittävimmät äänestykset tuloksineen ja ketkä edustajat olivat eniten äänessä. ${ALWAYS_FINNISH}`,
        collectHomeText(scope),
      ),
  },
  party: {
    type: "tldr",
    length: "long",
    sharedContext:
      "Aineisto on Suomen eduskuntaryhmän profiili: paikkamäärä, äänestysyhtenäisyys, läsnäolo ja muut tunnusluvut. Tuota kooste aina suomeksi.",
    contextLabel: "Eduskuntaryhmä",
    collectParts: (scope, el) =>
      singlePart(
        `Tehtävä: Kuvaile suomeksi ja perusteellisesti, millainen tämä eduskuntaryhmä on tunnuslukujen valossa. Kerro ryhmän koko, kuinka yhtenäisesti se äänestää, miten ahkerasti edustajat ovat paikalla ja mitä luvut kertovat ryhmästä. Kirjoita kokonaisin virkkein. ${ALWAYS_FINNISH}`,
        collectPartyText(wrapOf(scope, el)),
      ),
  },
};

// ─── Document subkind profiles ────────────────────────────────────────────────

const DOC_CONTEXT_LABEL = "Asiakirjan otsikko";

export const DOC_SUBKIND_PROFILES: Record<string, SummaryProfile> = {
  kk: {
    type: "key-points",
    length: "medium",
    sharedContext:
      "Aineisto on eduskunnan kirjallinen kysymys tai ministerin siihen antama vastaus. Tuota kooste aina suomeksi.",
    contextLabel: DOC_CONTEXT_LABEL,
    collectParts: (scope) => collectWrittenQuestionParts(scope),
  },
  he: {
    type: "key-points",
    length: "long",
    sharedContext:
      "Aineisto on hallituksen esitys eduskunnalle eli lakiesitys perusteluineen. Tuota kooste aina suomeksi.",
    contextLabel: DOC_CONTEXT_LABEL,
    collectParts: (scope) =>
      singlePart(
        `Tehtävä: Laadi kattava suomenkielinen kooste hallituksen esityksestä. Kerro mitä lakia tai lakeja esitetään säädettäväksi tai muutettavaksi, esityksen keskeinen sisältö, tavoitteet ja perustelut sekä ehdotettu voimaantulo, jos se mainitaan. ${ALWAYS_FINNISH}`,
        collectGovernmentProposalText(scope),
      ),
  },
  mietinto: {
    type: "key-points",
    length: "long",
    sharedContext:
      "Aineisto on eduskunnan valiokunnan mietintö käsiteltävästä asiasta. Tuota kooste aina suomeksi.",
    contextLabel: DOC_CONTEXT_LABEL,
    collectParts: (scope) =>
      singlePart(
        `Tehtävä: Laadi kattava suomenkielinen kooste valiokunnan mietinnöstä. Kerro mitä asiaa mietintö koskee, mitä valiokunta esittää, keskeiset perustelut ja mahdolliset vastalauseet tai eriävät mielipiteet. ${ALWAYS_FINNISH}`,
        collectCommitteeReportText(scope),
      ),
  },
  aloite: {
    type: "key-points",
    length: "long",
    sharedContext:
      "Aineisto on kansanedustajan eduskunnalle tekemä lakialoite. Tuota kooste aina suomeksi.",
    contextLabel: DOC_CONTEXT_LABEL,
    collectParts: (scope) =>
      singlePart(
        `Tehtävä: Laadi kattava suomenkielinen kooste eduskunnan lakialoitteesta. Kerro mitä aloitteessa ehdotetaan, kuka sen teki, keskeiset perustelut ja mitä vaikutuksia ehdotuksella tavoitellaan. ${ALWAYS_FINNISH}`,
        collectDefaultDocumentText(scope, "Lakialoite"),
      ),
  },
  suullinen: {
    type: "tldr",
    length: "long",
    sharedContext:
      "Aineisto on eduskunnan kyselytunnilla esitetty suullinen kysymys. Tuota kooste aina suomeksi.",
    contextLabel: DOC_CONTEXT_LABEL,
    collectParts: (scope) =>
      singlePart(
        `Tehtävä: Selitä suomeksi ja perusteellisesti, mistä tässä eduskunnan suullisessa kysymyksessä on kyse. Kerro kuka kysyi, mitä kysyttiin, keneltä ja miksi aihe on ajankohtainen. Kirjoita kokonaisin virkkein. ${ALWAYS_FINNISH}`,
        collectDefaultDocumentText(scope, "Suullinen kysymys"),
      ),
  },
  valikysymys: {
    type: "key-points",
    length: "long",
    sharedContext:
      "Aineisto on opposition hallitukselle esittämä välikysymys. Tuota kooste aina suomeksi.",
    contextLabel: DOC_CONTEXT_LABEL,
    collectParts: (scope) =>
      singlePart(
        `Tehtävä: Laadi kattava suomenkielinen kooste eduskunnan välikysymyksestä. Kerro mitä hallitukselta kysytään, ketkä kysymyksen esittivät, keskeiset perustelut ja mihin epäkohtiin välikysymys vetoaa. ${ALWAYS_FINNISH}`,
        collectDefaultDocumentText(scope, "Välikysymys"),
      ),
  },
  vastaus: {
    type: "key-points",
    length: "long",
    sharedContext:
      "Aineisto on ministerin kirjallinen vastaus eduskunnan kysymykseen. Tuota kooste aina suomeksi.",
    contextLabel: DOC_CONTEXT_LABEL,
    collectParts: (scope) =>
      singlePart(
        `Tehtävä: Laadi kattava suomenkielinen kooste ministerin kirjallisesta vastauksesta. Kerro mihin kysymykseen vastattiin, mitä ministeri vastasi, miten vastausta perusteltiin ja mihin toimiin hallitus aikoo ryhtyä. ${ALWAYS_FINNISH}`,
        collectDefaultDocumentText(scope, "Ministerin kirjallinen vastaus"),
      ),
  },
  asiantuntija: {
    type: "key-points",
    length: "long",
    sharedContext:
      "Aineisto on asiantuntijalausunto eduskunnan valiokunnalle. Tuota kooste aina suomeksi.",
    contextLabel: DOC_CONTEXT_LABEL,
    collectParts: (scope) =>
      singlePart(
        `Tehtävä: Laadi kattava suomenkielinen kooste asiantuntijalausunnosta. Kerro kuka tai mikä taho lausunnon antoi, mitä asiaa se koskee, asiantuntijan keskeiset huomiot sekä suositukset tai muutosehdotukset. ${ALWAYS_FINNISH}`,
        collectDefaultDocumentText(scope, "Asiantuntijalausunto"),
      ),
  },
  "vastaus-edk": {
    type: "key-points",
    length: "long",
    sharedContext:
      "Aineisto on eduskunnan vastaus eli eduskunnan lopullinen päätös käsitellystä asiasta. Tuota kooste aina suomeksi.",
    contextLabel: DOC_CONTEXT_LABEL,
    collectParts: (scope) =>
      singlePart(
        `Tehtävä: Laadi kattava suomenkielinen kooste eduskunnan vastauksesta. Kerro mitä eduskunta päätti, mitkä lait hyväksyttiin ja millaisin muutoksin sekä mahdolliset lausumat. ${ALWAYS_FINNISH}`,
        collectDefaultDocumentText(scope, "Eduskunnan vastaus"),
      ),
  },
};

// ─── Block profiles ───────────────────────────────────────────────────────────
// Per-block summaries are a 3–5 sentence paragraph. The surrounding topic is
// delivered via the per-call context channel (data-ai-context), never mixed
// into the input text.

export const BLOCK_PROFILES: Record<string, SummaryProfile> = {
  speech: {
    type: "tldr",
    length: "medium",
    sharedContext:
      "Aineisto on yksittäinen puheenvuoro Suomen eduskunnan täysistunnosta. Tuota tiivistelmä aina suomeksi.",
    contextLabel: "Keskustelun aihe",
    collectParts: (_scope, el) =>
      singlePart(
        `Tehtävä: Tiivistä tämä eduskunnan puheenvuoro suomeksi 3–5 virkkeellä. Kerro puhujan keskeinen viesti, tärkeimmät perustelut ja mahdolliset vaatimukset tai ehdotukset. ${ALWAYS_FINNISH}`,
        collectSpeechBlockText(el),
      ),
  },
  "doc-section": {
    type: "tldr",
    length: "medium",
    sharedContext:
      "Aineisto on yksittäinen osio Suomen eduskunnan asiakirjasta. Tuota tiivistelmä aina suomeksi.",
    contextLabel: "Asiakirjan osio",
    collectParts: (_scope, el) =>
      singlePart(
        `Tehtävä: Tiivistä tämä eduskunnan asiakirjan osio suomeksi 3–5 virkkeellä. Kerro mistä osiossa on kyse ja mikä on sen keskeinen sisältö. ${ALWAYS_FINNISH}`,
        collectDocSectionText(el),
      ),
  },
};

export function resolvePageProfile(
  kind: string,
  subkind: string | undefined,
): SummaryProfile | null {
  if (kind === "document") {
    return (subkind && DOC_SUBKIND_PROFILES[subkind]) || null;
  }
  return PAGE_PROFILES[kind] ?? null;
}

// ─── Page collectors ──────────────────────────────────────────────────────────

// On-device model input quota is limited, so a long debate cannot be fed in
// full: clip each speech and cap the total, stating explicitly how many
// speeches were left out so the model does not present a partial picture as
// complete.
const DEBATE_SPEECH_CLIP = 1800;
const DEBATE_TOTAL_CAP = 12000;

function collectDebateText(wrap: HTMLElement): string {
  const speeches = wrap.querySelectorAll<HTMLElement>("#transcript .speech");
  const parts: string[] = [];
  let total = 0;
  let omitted = 0;

  for (const sp of speeches) {
    const roleEl = sp.querySelector(".speech__role");
    if (!roleEl || roleEl.classList.contains("reply")) continue;

    const nameEl = sp.querySelector(".speech__name");
    const tagEl = sp.querySelector<HTMLElement>(".tag");
    const bodyEl = sp.querySelector(".speech__body p");
    const content = bodyEl?.textContent?.trim();
    if (!content) continue;

    if (total >= DEBATE_TOTAL_CAP) {
      omitted++;
      continue;
    }

    const name = nameEl?.textContent?.trim() ?? "Puhuja";
    const party = tagEl?.textContent?.trim() ?? "";

    const entry = `Puhuja: ${name} (${party})\nRyhmäpuheenvuoro:\n${clip(content, DEBATE_SPEECH_CLIP)}`;
    parts.push(entry);
    total += entry.length;
  }

  if (omitted > 0) {
    parts.push(
      `(Aineistosta puuttuu tilan vuoksi ${omitted} muuta ryhmäpuheenvuoroa.)`,
    );
  }

  return parts.join("\n\n---\n\n");
}

function collectVotingText(wrap: HTMLElement): string {
  const parts: string[] = [`Äänestyksen aihe: ${headingOf(wrap)}`];

  const props = wrap.querySelectorAll<HTMLElement>(".vresult__q .prop");
  for (const prop of props) {
    const text = prop.textContent?.trim();
    if (text) parts.push(`Ehdotus: ${text}`);
  }

  const legendRows = wrap.querySelectorAll<HTMLElement>(
    ".vresult .vote-legend .vl",
  );
  if (legendRows.length > 0) {
    parts.push("\nÄänet:");
    for (const row of legendRows) {
      const key = row.querySelector(".vk")?.textContent?.trim();
      const val = row.querySelector(".vv")?.textContent?.trim();
      if (key && val) parts.push(`- ${key}: ${val}`);
    }
  }

  const decisionMain = wrap.querySelector<HTMLElement>(
    ".decision .t:not(.sub)",
  );
  if (decisionMain?.textContent?.trim()) {
    parts.push(`\nTulos: ${decisionMain.textContent.trim()}`);
  }

  const decisionSub = wrap.querySelector<HTMLElement>(".decision .t.sub");
  if (decisionSub?.textContent?.trim()) {
    parts.push(`Hallitus/Oppositio: ${decisionSub.textContent.trim()}`);
  }

  const partyRows = wrap.querySelectorAll<HTMLElement>("#ryhmat .pvote");
  if (partyRows.length > 0) {
    parts.push("\nEduskuntaryhmien äänet:");
    for (const row of partyRows) {
      const name = row.querySelector(".pvote__name")?.textContent?.trim();
      const num = row
        .querySelector(".pvote__num")
        ?.textContent?.trim()
        .replace(/\s+/g, " ");
      if (name && num) parts.push(`- ${name}: ${num}`);
    }
  }

  return parts.join("\n");
}

function collectSessionText(scope: HTMLElement, el: HTMLElement): string {
  const parts: string[] = [`Istunto: ${headingOf(wrapOf(scope, el))}`];

  const votingItems = scope.querySelectorAll<HTMLElement>(
    "#paatosasiat .ag-title",
  );
  if (votingItems.length > 0) {
    parts.push("\nPäätösasiat (äänestettiin):");
    for (const item of votingItems) {
      const t = item.textContent?.trim();
      if (t) parts.push(`- ${t}`);
    }
  }

  const discussionItems = scope.querySelectorAll<HTMLElement>(
    "#keskustelut .ag-title",
  );
  if (discussionItems.length > 0) {
    parts.push("\nKeskusteluasiat:");
    for (const item of discussionItems) {
      const t = item.textContent?.trim();
      if (t) parts.push(`- ${t}`);
    }
  }

  return parts.join("\n");
}

function collectHomeText(scope: HTMLElement): string {
  const reactive = scope.querySelector<HTMLElement>("#tl-reactive") ?? scope;
  const date =
    scope
      .querySelector<HTMLElement>("[data-tl-datetime]")
      ?.textContent?.trim() ?? "";
  const sessionKey =
    scope
      .querySelector<HTMLElement>("[data-tl-session]")
      ?.textContent?.trim() ?? "";

  const parts: string[] = [];
  if (date) parts.push(`Päivämäärä: ${date}`);
  if (sessionKey) parts.push(`Täysistunto: ${sessionKey}`);

  const voteRows = reactive.querySelectorAll<HTMLElement>(".vote-row");
  if (voteRows.length > 0) {
    parts.push("\nTiukat äänestykset:");
    for (const row of voteRows) {
      const badge =
        row.querySelector(".vote-row__badge")?.textContent?.trim() ?? "";
      const title =
        row.querySelector(".vote-row__title")?.textContent?.trim() ?? "";
      const result =
        row.querySelector(".vote-row__result .r-line")?.textContent?.trim() ??
        "";
      if (title) parts.push(`- ${badge}: ${title} (${result})`);
    }
  }

  const speakers = reactive.querySelectorAll<HTMLElement>(".rail__item");
  if (speakers.length > 0) {
    parts.push("\nEniten puheenvuoroja:");
    for (const s of speakers) {
      const name = s.querySelector(".rail__title")?.textContent?.trim() ?? "";
      const meta = s.querySelector(".rail__meta")?.textContent?.trim() ?? "";
      if (name) parts.push(`- ${name} (${meta})`);
    }
  }

  return parts.join("\n");
}

function collectPartyText(wrap: HTMLElement): string {
  const name =
    wrap.querySelector<HTMLElement>(".bio-name")?.textContent?.trim() ?? "";
  const parts: string[] = [`Eduskuntaryhmä: ${name}`];

  const stats = wrap.querySelectorAll<HTMLElement>(".bio-stat");
  for (const stat of stats) {
    const key = stat.querySelector(".k")?.textContent?.trim() ?? "";
    const val = stat.querySelector(".v")?.textContent?.trim() ?? "";
    if (key && val) parts.push(`${key}: ${val}`);
  }

  const cohesionIntro = wrap
    .querySelector<HTMLElement>(".psec__intro")
    ?.textContent?.trim();
  if (cohesionIntro) {
    parts.push(`\nÄänestysyhtenäisyys: ${cohesionIntro}`);
  }

  const legendRows = wrap.querySelectorAll<HTMLElement>(
    ".psec .vote-legend .vl",
  );
  for (const row of legendRows) {
    const key = row.querySelector(".vk")?.textContent?.trim();
    const val = row.querySelector(".vv")?.textContent?.trim();
    if (key && val) parts.push(`- ${key}: ${val}`);
  }

  const dissentRows = wrap.querySelectorAll<HTMLElement>(".vote-row");
  if (dissentRows.length > 0) {
    parts.push("\nÄänestykset, joissa ryhmän linjasta poikettiin:");
    for (const row of dissentRows) {
      const badge =
        row.querySelector(".vote-row__badge")?.textContent?.trim() ?? "";
      const title =
        row.querySelector(".vote-row__title")?.textContent?.trim() ?? "";
      const date =
        row.querySelector(".vote-row__sub")?.textContent?.trim() ?? "";
      if (title) {
        parts.push(`- ${title} (${badge} poikkeavaa ääntä, ${date})`);
      }
    }
  }

  return parts.join("\n");
}

// ─── Document collectors ──────────────────────────────────────────────────────

function collectDefaultDocumentText(
  scope: HTMLElement,
  kindLabel: string,
): string {
  const parts: string[] = [`${kindLabel}: ${headingOf(scope)}`];

  const texts = paragraphTexts(
    scope.querySelector<HTMLElement>(".article"),
    30,
  );
  const body = clip(texts.join("\n\n"), 6000);
  if (body) parts.push(`\nSisältö:\n${body}`);

  return parts.join("\n");
}

/**
 * Written question (KK) pages contain both the question and the ministerial
 * answer, with `#vastaus` nested inside `#kysymys`. The two are summarised as
 * separate parts with their own instructions, and the question part must
 * exclude the nested answer subtree.
 */
function collectWrittenQuestionParts(scope: HTMLElement): SummaryPart[] {
  const title = headingOf(scope);
  const parts: SummaryPart[] = [];

  const questionTexts = paragraphTexts(
    scope.querySelector<HTMLElement>("#kysymys"),
    20,
    (p) => p.closest("#vastaus") !== null,
  );
  const questionBody = clip(questionTexts.join("\n\n"), 4000);
  if (questionBody) {
    parts.push({
      heading: "Kysymys",
      instruction: `Tehtävä: Laadi kattava suomenkielinen tiivistelmä eduskunnan kirjallisesta kysymyksestä. Kerro kuka kysyi, mitä kysyttiin ja millä perusteilla. ${ALWAYS_FINNISH}`,
      text: `Kirjallinen kysymys: ${title}\n\nKysymyksen teksti:\n${questionBody}`,
    });
  }

  const answerTexts = paragraphTexts(
    scope.querySelector<HTMLElement>("#vastaus"),
    20,
  );
  const answerBody = clip(answerTexts.join("\n\n"), 4000);
  if (answerBody) {
    parts.push({
      heading: "Ministerin vastaus",
      instruction: `Tehtävä: Laadi kattava suomenkielinen tiivistelmä ministerin vastauksesta eduskunnan kirjalliseen kysymykseen. Kerro mitä ministeri vastasi, miten vastausta perusteltiin ja mihin toimiin hallitus aikoo ryhtyä. ${ALWAYS_FINNISH}`,
      text: `Kirjallinen kysymys: ${title}\n\nMinisterin vastaus:\n${answerBody}`,
    });
  }

  return parts;
}

function collectPhasedDocumentText(
  scope: HTMLElement,
  kindLabel: string,
  perPhaseMax: number,
  maxPhases: number,
): string {
  const parts: string[] = [`${kindLabel}: ${headingOf(scope)}`];

  const phases = scope.querySelectorAll<HTMLElement>(".article__phase");
  let count = 0;
  for (const phase of phases) {
    if (count >= maxPhases) break;
    const heading = phaseHeading(phase);
    let node = phase.nextElementSibling;
    const contents: string[] = [];
    while (node && !node.classList.contains("article__phase")) {
      const text = contentNodeText(node, 20);
      if (text) contents.push(text);
      node = node.nextElementSibling;
    }
    const body = contents.join("\n\n");

    if (heading && body) {
      parts.push(`\n${heading}:\n${clip(body, perPhaseMax)}`);
      count++;
    }
  }

  return parts.join("\n");
}

function collectGovernmentProposalText(scope: HTMLElement): string {
  return collectPhasedDocumentText(
    scope,
    "Hallituksen esitys",
    2500,
    Number.POSITIVE_INFINITY,
  );
}

function collectCommitteeReportText(scope: HTMLElement): string {
  return collectPhasedDocumentText(scope, "Valiokunnan mietintö", 2500, 3);
}

// ─── Block collectors ─────────────────────────────────────────────────────────

function collectSpeechBlockText(el: HTMLElement): string {
  const speech = el.closest<HTMLElement>(".speech");
  if (!speech) return "";

  const nameEl = speech.querySelector<HTMLElement>(".speech__name");
  const tagEl = speech.querySelector<HTMLElement>(".tag");
  const bodyEl = speech.querySelector<HTMLElement>(".speech__body p");
  const content = bodyEl?.textContent?.trim();

  if (!content) return "";

  const name = nameEl?.textContent?.trim() ?? "Puhuja";
  const party = tagEl?.textContent?.trim() ?? "";
  const speaker = party ? `${name} (${party})` : name;
  return `Puhuja: ${speaker}\n\nPuheenvuoro:\n${content}`;
}

/**
 * Finds the result container a block summary should render into. For
 * speeches it is the (single) result slot inside the speech card. For
 * document sections it is the result element following the heading that
 * holds the trigger button — each section has its own slot, so the search
 * must not escape to the first slot in the whole article.
 */
export function findBlockResult(el: HTMLElement): HTMLElement | null {
  if (el.dataset.aiTarget === "parent") {
    return (
      el.parentElement?.querySelector<HTMLElement>(".js-ai-block-result") ??
      null
    );
  }

  const speech = el.closest<HTMLElement>(".speech");
  if (speech) {
    return speech.querySelector<HTMLElement>(".js-ai-block-result");
  }

  const heading =
    el.closest<HTMLElement>(".article__phase") ??
    el.closest<HTMLElement>("h3") ??
    el;
  let node = heading.nextElementSibling;
  while (node && !node.classList.contains("article__phase")) {
    if (node.classList.contains("js-ai-block-result")) {
      return node as HTMLElement;
    }
    node = node.nextElementSibling;
  }
  return null;
}

function collectDocSectionText(el: HTMLElement): string {
  const phase = el.closest<HTMLElement>(".article__phase");
  if (!phase) return "";

  const heading = phaseHeading(phase);
  let node = phase.nextElementSibling;
  const parts: string[] = [];
  while (
    node &&
    !node.classList.contains("article__phase") &&
    !node.classList.contains("article__sig")
  ) {
    const text = contentNodeText(node, 10);
    if (text) parts.push(text);
    node = node.nextElementSibling;
  }

  const body = clip(parts.join("\n\n"), 6000);
  if (heading && body) return `Osio: ${heading}\n\n${body}`;
  return body || heading;
}
