import htmx from "htmx.org";

// ─── Session singleton ────────────────────────────────────────────────────────
// One Summarizer session per page lifetime, reused across HTMX navigations.
// Created eagerly when the first summary block is found; on-demand generation
// waits for the session to be ready.

type SessionState =
  | "idle"
  | "checking"
  | "unsupported"
  | "downloading"
  | "ready"
  | "error";

let session: Summarizer | null = null;
let sessionState: SessionState = "idle";
let sessionInitPromise: Promise<void> | null = null;

const CREATE_OPTS: SummarizerCreateOptions = {
  type: "tldr",
  format: "plain-text",
  length: "medium",
  outputLanguage: "fi",
  sharedContext:
    "Tiedot Suomen eduskunnasta: täysistunnot, äänestykset, asiakirjat, eduskuntaryhmät ja kansanedustajat. Luo kooste suomeksi lyhyesti ja selkeästi.",
};

// ─── Per-kind configuration ──────────────────────────────────────────────────

interface KindConfig {
  instruction: string;
  collect: (scope: HTMLElement, el: HTMLElement) => string;
}

const DOC_SUBKIND_CONFIG: Record<string, KindConfig> = {
  kk: {
    instruction:
      "Olet analysoimassa eduskunnan kirjallista kysymystä ja ministerin vastausta. Tehtäväsi: Mistä kysymyksessä on kyse ja miten ministeri vastasi? Tiivistä molemmat puolet.",
    collect: collectWrittenQuestionText,
  },
  he: {
    instruction:
      "Olet analysoimassa hallituksen lakiesitystä. Tehtäväsi: Mitä lakia esitetään ja mitkä ovat keskeiset perustelut? Tiivistä pääkohdat.",
    collect: collectGovernmentProposalText,
  },
  mietinto: {
    instruction:
      "Olet analysoimassa valiokunnan mietintöä. Tehtäväsi: Mitä valiokunta esittää ja millä perusteilla? Tiivistä keskeiset johtopäätökset.",
    collect: collectCommitteeReportText,
  },
  aloite: {
    instruction:
      "Olet analysoimassa eduskunnan lakialoitetta. Tehtäväsi: Mitä aloitteessa ehdotetaan ja miksi? Tiivistä keskeinen sisältö.",
    collect: collectDefaultDocumentText,
  },
  suullinen: {
    instruction:
      "Olet analysoimassa eduskunnan suullista kysymystä. Tehtäväsi: Mitä kysyttiin ja miksi? Tiivistä kysymyksen keskeinen sisältö.",
    collect: collectDefaultDocumentText,
  },
  valikysymys: {
    instruction:
      "Olet analysoimassa eduskunnan välikysymystä. Tehtäväsi: Mitä hallitukselta kysytään ja miksi? Tiivistä välikysymyksen pääkohdat.",
    collect: collectDefaultDocumentText,
  },
  vastaus: {
    instruction:
      "Olet analysoimassa ministerin kirjallista vastausta eduskunnan kysymykseen. Tehtäväsi: Mitä ministeri vastasi? Tiivistä vastauksen keskeinen sisältö.",
    collect: collectWrittenResponseText,
  },
  asiantuntija: {
    instruction:
      "Olet analysoimassa asiantuntijalausuntoa eduskunnalle. Tehtäväsi: Mitä asiantuntija lausuu ja mitä hän suosittaa? Tiivistä lausunnon keskeinen sisältö.",
    collect: collectDefaultDocumentText,
  },
  "vastaus-edk": {
    instruction:
      "Olet analysoimassa eduskunnan vastausta. Tehtäväsi: Mitä eduskunta päätti ja mitä lainsäädäntöä hyväksyttiin? Tiivistä keskeinen sisältö.",
    collect: collectDefaultDocumentText,
  },
};

const BLOCK_KIND_CONFIG: Record<
  string,
  { instruction: string; collect: (el: HTMLElement) => string }
> = {
  speech: {
    instruction:
      "Olet analysoimassa yksittäistä eduskunnan puheenvuoroa. Tehtäväsi: Mitä puhuja sanoi? Tiivistä puheenvuoron keskeinen viesti yhdellä tai kahdella lauseella.",
    collect: collectSpeechBlockText,
  },
  "doc-section": {
    instruction:
      "Olet analysoimassa yksittäistä osiota eduskunnan asiakirjasta. Tehtäväsi: Mistä tässä osiossa on kyse? Tiivistä keskeinen sisältö lyhyesti.",
    collect: collectDocSectionText,
  },
};

async function ensureSession(): Promise<void> {
  if (sessionInitPromise) return sessionInitPromise;
  sessionInitPromise = doInitSession();
  return sessionInitPromise;
}

async function doInitSession(): Promise<void> {
  if (!("Summarizer" in self)) {
    sessionState = "unsupported";
    refreshAllBlocks();
    return;
  }
  sessionState = "checking";
  refreshAllBlocks();

  const avail = await Summarizer.availability({
    type: CREATE_OPTS.type,
    format: CREATE_OPTS.format,
    length: CREATE_OPTS.length,
    outputLanguage: CREATE_OPTS.outputLanguage,
  });

  if (avail === "unavailable") {
    sessionState = "unsupported";
    refreshAllBlocks();
    return;
  }

  if (avail === "downloadable" || avail === "downloading") {
    sessionState = "downloading";
    refreshAllBlocks();
  }

  try {
    session = await Summarizer.create({
      ...CREATE_OPTS,
      monitor: (m) => {
        m.addEventListener("downloadprogress", () => {
          sessionState = "downloading";
          refreshAllBlocks();
        });
      },
    });
    sessionState = "ready";
    refreshAllBlocks();
  } catch {
    sessionState = "error";
    refreshAllBlocks();
  }
}

function refreshAllBlocks(): void {
  document
    .querySelectorAll<HTMLElement>(".js-ai-summary[data-ai-kind]")
    .forEach((el) => {
      if (el.dataset.aiGenerating === "1") return;
      renderBlockState(el);
    });
  updateAiStatus();
}

// ─── Footer status indicator ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SessionState,
  { dot: string; text: string; show: boolean }
> = {
  idle: { dot: "", text: "", show: false },
  checking: { dot: "is-checking", text: "Tekoäly · tarkistetaan", show: true },
  unsupported: {
    dot: "is-unsupported",
    text: "Tekoäly · ei saatavilla tässä selaimessa",
    show: true,
  },
  downloading: {
    dot: "is-downloading",
    text: "Tekoäly · ladataan mallia ensimmäistä kertaa",
    show: true,
  },
  ready: { dot: "is-ready", text: "Tekoäly · valmis", show: true },
  error: { dot: "is-error", text: "Tekoäly · alustusvirhe", show: true },
};

function updateAiStatus(): void {
  const el = document.getElementById("js-ai-status");
  if (!el) return;
  const { dot, text, show } = STATUS_CONFIG[sessionState];
  if (!show) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = `<span class="ai-dot ${dot}" aria-hidden="true"></span><span>${text}</span>`;
}

// ─── Block state rendering ───────────────────────────────────────────────────

function renderBlockState(el: HTMLElement): void {
  const inner = el.querySelector<HTMLElement>(".summary__in");
  if (!inner) return;

  const qEl = inner.querySelector<HTMLElement>(".summary__q");
  const footEl = inner.querySelector<HTMLElement>(".summary__foot");

  inner.innerHTML = "";
  if (qEl) inner.appendChild(qEl);

  const stateEl = document.createElement("div");
  stateEl.className = "summary__state";

  switch (sessionState) {
    case "idle":
    case "checking":
      stateEl.innerHTML =
        '<p class="summary__lead summary__lead--muted">Tarkistetaan tekoälyn saatavuutta…</p>';
      break;
    case "unsupported":
      stateEl.innerHTML =
        '<p class="summary__lead summary__lead--muted">Tekoälykooste vaatii Chrome 138+:n Gemini Nano -malleineen.</p>';
      break;
    case "downloading":
      stateEl.innerHTML =
        '<p class="summary__lead summary__lead--muted">Ladataan tekoälymallia ensimmäistä käyttöä varten… Tämä tapahtuu vain kerran.</p>';
      break;
    case "ready": {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "summary__btn";
      btn.innerHTML = '<span class="spark">✦</span> Luo kooste';
      btn.addEventListener("click", () => generateSummary(el));
      stateEl.appendChild(btn);
      break;
    }
    case "error":
      stateEl.innerHTML =
        '<p class="summary__lead summary__lead--muted">Tekoälykooste ei ole käytettävissä juuri nyt.</p>';
      break;
  }

  inner.appendChild(stateEl);
  if (footEl) inner.appendChild(footEl);
}

// ─── Summary generation ───────────────────────────────────────────────────────

function getKindConfig(
  kind: string,
  el: HTMLElement,
): { instruction: string } | null {
  if (kind === "document") {
    const subkind = el.dataset.aiSubkind;
    if (subkind && DOC_SUBKIND_CONFIG[subkind]) {
      return DOC_SUBKIND_CONFIG[subkind];
    }
  }
  return null;
}

function buildContext(
  instruction: string | undefined,
  rawContext: string,
): string {
  if (instruction && rawContext) {
    return `${instruction}\n\nKonteksti: ${rawContext}`;
  }
  return instruction || rawContext;
}

async function generateSummary(el: HTMLElement): Promise<void> {
  if (!session) return;
  const kind = el.dataset.aiKind ?? "debate";
  const rawContext = el.dataset.aiContext ?? "";

  const text = collectText(kind, el);
  if (!text) return;

  const kindConfig = getKindConfig(kind, el);
  const context = buildContext(kindConfig?.instruction, rawContext);

  el.dataset.aiGenerating = "1";

  const inner = el.querySelector<HTMLElement>(".summary__in");
  if (!inner) return;

  const qEl = inner.querySelector<HTMLElement>(".summary__q");
  const footEl = inner.querySelector<HTMLElement>(".summary__foot");

  inner.innerHTML = "";
  if (qEl) inner.appendChild(qEl);

  const leadEl = document.createElement("p");
  leadEl.className = "summary__lead";
  leadEl.textContent = "Luodaan kooste…";
  inner.appendChild(leadEl);

  if (footEl) inner.appendChild(footEl);

  try {
    const stream = session.summarizeStreaming(text, {
      context: context || undefined,
    });
    // The API streams full replacement text per chunk, not deltas — consume
    // silently and do a single DOM update when done.
    leadEl.classList.add("summary__lead--streaming");
    const reader = stream.getReader();
    let accumulated = "";
    while (true) {
      const { done, value } = await reader.read();
      if (value) accumulated += value; // skip empty flush chunks; also captures done:true+value
      if (done) break;
    }
    leadEl.classList.remove("summary__lead--streaming");

    const points = parseKeyPoints(accumulated);
    leadEl.textContent = points[0] ?? accumulated.trim();
    if (points.length > 1) {
      const ul = document.createElement("ul");
      ul.className = "summary__points";
      for (const point of points.slice(1)) {
        const li = document.createElement("li");
        li.textContent = point;
        ul.appendChild(li);
      }
      leadEl.insertAdjacentElement("afterend", ul);
    }
  } catch {
    inner.innerHTML = "";
    if (qEl) inner.appendChild(qEl);
    const errEl = document.createElement("p");
    errEl.className = "summary__lead summary__lead--muted";
    errEl.textContent = "Kooste epäonnistui. Yritä uudelleen.";
    inner.appendChild(errEl);

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.className = "summary__btn";
    retryBtn.textContent = "Yritä uudelleen";
    retryBtn.addEventListener("click", () => {
      delete el.dataset.aiGenerating;
      void generateSummary(el);
    });
    inner.appendChild(retryBtn);
    if (footEl) inner.appendChild(footEl);
  } finally {
    delete el.dataset.aiGenerating;
  }
}

function parseKeyPoints(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 0);
}

// ─── Text extraction ──────────────────────────────────────────────────────────

function collectText(kind: string, el: HTMLElement): string {
  const mainContent =
    document.querySelector<HTMLElement>("#main-content") ?? document.body;
  switch (kind) {
    case "debate":
      return collectDebateText(
        el.closest<HTMLElement>(".wrap") ?? document.body,
      );
    case "voting":
      return collectVotingText(
        el.closest<HTMLElement>(".wrap") ?? document.body,
      );
    case "session":
      return collectSessionText(mainContent, el);
    case "home":
      return collectHomeText(
        document.querySelector<HTMLElement>("#tl-reactive") ?? mainContent,
      );
    case "document": {
      const subkind = el.dataset.aiSubkind;
      const cfg = subkind ? DOC_SUBKIND_CONFIG[subkind] : null;
      if (cfg) return cfg.collect(mainContent, el);
      return collectDefaultDocumentText(mainContent);
    }
    case "party":
      return collectPartyText(
        el.closest<HTMLElement>(".wrap") ?? document.body,
      );
    default:
      return "";
  }
}

function collectDebateText(wrap: HTMLElement): string {
  const speeches = wrap.querySelectorAll<HTMLElement>("#transcript .speech");
  const parts: string[] = [];

  for (const sp of speeches) {
    const roleEl = sp.querySelector(".speech__role");
    if (!roleEl || roleEl.classList.contains("reply")) continue;

    const nameEl = sp.querySelector(".speech__name");
    const tagEl = sp.querySelector<HTMLElement>(".tag");
    const bodyEl = sp.querySelector(".speech__body p");
    const content = bodyEl?.textContent?.trim();
    if (!content) continue;

    const name = nameEl?.textContent?.trim() ?? "Puhuja";
    const party = tagEl?.textContent?.trim() ?? "";

    parts.push(`Puhuja: ${name} (${party})\nRyhmäpuheenvuoro:\n${content}`);
  }

  return parts.join("\n\n---\n\n");
}

function collectVotingText(wrap: HTMLElement): string {
  const title =
    wrap.querySelector<HTMLElement>("h1")?.textContent?.trim() ?? "";
  const parts: string[] = [`Äänestyksen aihe: ${title}`];

  const props = wrap.querySelectorAll<HTMLElement>(".vresult__q .prop");
  for (const prop of props) {
    const text = prop.textContent?.trim();
    if (text) parts.push(`Ehdotus: ${text}`);
  }

  const decisionMain = wrap.querySelector<HTMLElement>(
    ".decision .t:not(.sub)",
  );
  if (decisionMain?.textContent?.trim()) {
    parts.push(`Tulos: ${decisionMain.textContent.trim()}`);
  }

  const decisionSub = wrap.querySelector<HTMLElement>(".decision .t.sub");
  if (decisionSub?.textContent?.trim()) {
    parts.push(`Hallitus/Oppositio: ${decisionSub.textContent.trim()}`);
  }

  return parts.join("\n");
}

function collectSessionText(scope: HTMLElement, el: HTMLElement): string {
  const title =
    el
      .closest(".wrap")
      ?.querySelector<HTMLElement>("h1")
      ?.textContent?.trim() ?? "";
  const parts: string[] = [`Istunto: ${title}`];

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
  const date =
    document
      .querySelector<HTMLElement>("[data-tl-datetime]")
      ?.textContent?.trim() ?? "";
  const sessionKey =
    document
      .querySelector<HTMLElement>("[data-tl-session]")
      ?.textContent?.trim() ?? "";

  const parts: string[] = [];
  if (date) parts.push(`Päivämäärä: ${date}`);
  if (sessionKey) parts.push(`Täysistunto: ${sessionKey}`);

  const voteRows = scope.querySelectorAll<HTMLElement>(".vote-row");
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

  const speakers = scope.querySelectorAll<HTMLElement>(".rail__item");
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

function collectDefaultDocumentText(scope: HTMLElement): string {
  const title =
    scope.querySelector<HTMLElement>("h1")?.textContent?.trim() ?? "";
  const parts: string[] = [`Asiakirja: ${title}`];

  const article = scope.querySelector<HTMLElement>(".article");
  if (article) {
    const paragraphs = article.querySelectorAll<HTMLElement>("p");
    const texts: string[] = [];
    for (const p of paragraphs) {
      const text = p.textContent?.trim();
      if (text && text.length > 30) texts.push(text);
    }
    let body = texts.join("\n\n");
    if (body.length > 6000) body = body.slice(0, 6000) + "…";
    if (body) parts.push(`\nSisältö:\n${body}`);
  }

  return parts.join("\n");
}

function collectWrittenQuestionText(scope: HTMLElement): string {
  const title =
    scope.querySelector<HTMLElement>("h1")?.textContent?.trim() ?? "";
  const parts: string[] = [`Kirjallinen kysymys: ${title}`];

  const questionArticle = scope.querySelector<HTMLElement>("#kysymys");
  if (questionArticle) {
    const paragraphs = questionArticle.querySelectorAll<HTMLElement>("p");
    const texts: string[] = [];
    for (const p of paragraphs) {
      const text = p.textContent?.trim();
      if (text && text.length > 20) texts.push(text);
    }
    let body = texts.join("\n\n");
    if (body.length > 4000) body = body.slice(0, 4000) + "…";
    if (body) parts.push(`\nKysymys:\n${body}`);
  }

  const answerDiv = scope.querySelector<HTMLElement>("#vastaus");
  if (answerDiv) {
    const paragraphs = answerDiv.querySelectorAll<HTMLElement>("p");
    const texts: string[] = [];
    for (const p of paragraphs) {
      const text = p.textContent?.trim();
      if (text && text.length > 20) texts.push(text);
    }
    let body = texts.join("\n\n");
    if (body.length > 4000) body = body.slice(0, 4000) + "…";
    if (body) parts.push(`\nMinisterin vastaus:\n${body}`);
  }

  return parts.join("\n");
}

function collectGovernmentProposalText(scope: HTMLElement): string {
  const title =
    scope.querySelector<HTMLElement>("h1")?.textContent?.trim() ?? "";
  const parts: string[] = [`Hallituksen esitys: ${title}`];

  const phases = scope.querySelectorAll<HTMLElement>(".article__phase");
  for (const phase of phases) {
    const heading = phase.textContent?.trim() ?? "";
    let node = phase.nextElementSibling;
    const contents: string[] = [];
    while (node && !node.classList.contains("article__phase")) {
      const text = node.textContent?.trim();
      if (text && text.length > 20) contents.push(text);
      node = node.nextElementSibling;
    }
    const body = contents.join("\n\n");

    if (heading && body) {
      let truncated = body;
      if (truncated.length > 2000) truncated = truncated.slice(0, 2000) + "…";
      parts.push(`\n${heading}:\n${truncated}`);
    }
  }

  return parts.join("\n");
}

function collectCommitteeReportText(scope: HTMLElement): string {
  const title =
    scope.querySelector<HTMLElement>("h1")?.textContent?.trim() ?? "";
  const parts: string[] = [`Valiokunnan mietintö: ${title}`];

  const phases = scope.querySelectorAll<HTMLElement>(".article__phase");
  let count = 0;
  for (const phase of phases) {
    const heading = phase.textContent?.trim() ?? "";
    let node = phase.nextElementSibling;
    const contents: string[] = [];
    while (node && !node.classList.contains("article__phase") && count < 3) {
      const text = node.textContent?.trim();
      if (text && text.length > 20) contents.push(text);
      node = node.nextElementSibling;
    }
    const body = contents.join("\n\n");

    if (heading && body) {
      let truncated = body;
      if (truncated.length > 1500) truncated = truncated.slice(0, 1500) + "…";
      parts.push(`\n${heading}:\n${truncated}`);
      count++;
    }
  }

  return parts.join("\n");
}

function collectWrittenResponseText(scope: HTMLElement): string {
  const title =
    scope.querySelector<HTMLElement>("h1")?.textContent?.trim() ?? "";
  const parts: string[] = [`Ministerin kirjallinen vastaus: ${title}`];

  const article = scope.querySelector<HTMLElement>(".article");
  if (article) {
    const paragraphs = article.querySelectorAll<HTMLElement>("p");
    const texts: string[] = [];
    for (const p of paragraphs) {
      const text = p.textContent?.trim();
      if (text && text.length > 20) texts.push(text);
    }
    let body = texts.join("\n\n");
    if (body.length > 5000) body = body.slice(0, 5000) + "…";
    if (body) parts.push(`\nVastaus:\n${body}`);
  }

  return parts.join("\n");
}

function collectPartyText(wrap: HTMLElement): string {
  const name =
    wrap.querySelector<HTMLElement>(".bio-name")?.textContent?.trim() ?? "";
  const parts: string[] = [`Puolue: ${name}`];

  const stats = wrap.querySelectorAll<HTMLElement>(".bio-stat");
  for (const stat of stats) {
    const key = stat.querySelector(".k")?.textContent?.trim() ?? "";
    const val = stat.querySelector(".v")?.textContent?.trim() ?? "";
    if (key && val) parts.push(`${key}: ${val}`);
  }

  return parts.join("\n");
}

// ─── Block-level text extraction ──────────────────────────────────────────────

function collectSpeechBlockText(el: HTMLElement): string {
  const speech = el.closest<HTMLElement>(".speech");
  if (!speech) return "";

  const nameEl = speech.querySelector<HTMLElement>(".speech__name");
  const bodyEl = speech.querySelector<HTMLElement>(".speech__body p");
  const content = bodyEl?.textContent?.trim();

  if (!content) return "";

  const name = nameEl?.textContent?.trim() ?? "Puhuja";
  return `Puhuja: ${name}\n\nPuheenvuoro:\n${content}`;
}

function collectDocSectionText(el: HTMLElement): string {
  const phase = el.closest<HTMLElement>(".article__phase");
  if (!phase) return "";

  const heading = phase.textContent?.trim() ?? "";
  let node = phase.nextElementSibling;
  const parts: string[] = [];
  while (
    node &&
    !node.classList.contains("article__phase") &&
    !node.classList.contains("article__sig")
  ) {
    const text = node.textContent?.trim();
    if (text && text.length > 10) parts.push(text);
    node = node.nextElementSibling;
  }

  const body = parts.join("\n\n");
  if (heading && body) return `Osio: ${heading}\n\n${body}`;
  return body || heading;
}

// ─── Block summary generation ─────────────────────────────────────────────────

function initBlockSummaries(root: Document | Element): void {
  root
    .querySelectorAll<HTMLElement>(".js-ai-block[data-ai-kind]")
    .forEach((el) => {
      if (el.dataset.aiBlockInit === "1") return;
      el.dataset.aiBlockInit = "1";
      el.addEventListener("click", () => {
        if (sessionState !== "ready" || !session) return;
        void generateBlockSummary(el);
      });
    });
}

async function generateBlockSummary(el: HTMLElement): Promise<void> {
  if (!session) return;

  const blockKind = el.dataset.aiKind ?? "";
  const cfg = BLOCK_KIND_CONFIG[blockKind];
  if (!cfg) return;

  const text = cfg.collect(el);
  if (!text) return;

  const sectionContext = el.dataset.aiContext ?? "";
  const context = sectionContext
    ? `${cfg.instruction}\n\nKonteksti: ${sectionContext}`
    : cfg.instruction;

  el.dataset.aiGenerating = "1";
  el.classList.add("is-generating");

  const resultEl = findBlockResult(el);
  if (!resultEl) {
    el.dataset.aiGenerating = "";
    el.classList.remove("is-generating");
    return;
  }

  resultEl.hidden = false;
  const textEl =
    resultEl.querySelector<HTMLElement>(".js-ai-block-text") ?? resultEl;
  textEl.textContent = "Luodaan tiivistelmä…";
  textEl.classList.add("ai-block--streaming");

  try {
    const stream = session.summarizeStreaming(text, { context });
    const reader = stream.getReader();
    let accumulated = "";
    while (true) {
      const { done, value } = await reader.read();
      if (value) accumulated += value;
      if (done) break;
    }
    textEl.classList.remove("ai-block--streaming");
    textEl.textContent = accumulated.trim() || "Tiivistelmää ei voitu tuottaa.";
  } catch {
    textEl.classList.remove("ai-block--streaming");
    textEl.textContent = "Tiivistelmän luonti epäonnistui.";
    resultEl.hidden = true;
  } finally {
    el.dataset.aiGenerating = "";
    el.classList.remove("is-generating");
  }
}

function findBlockResult(el: HTMLElement): HTMLElement | null {
  const anchor =
    el.dataset.aiTarget === "parent"
      ? el.parentElement
      : (el.closest<HTMLElement>(".speech") ??
        el.closest<HTMLElement>(".article"));

  if (!anchor) return null;

  const existing = anchor.querySelector<HTMLElement>(".js-ai-block-result");
  if (existing) return existing;

  const sibling = el.nextElementSibling;
  if (sibling && sibling.classList.contains("js-ai-block-result")) {
    return sibling as HTMLElement;
  }

  return null;
}

// ─── Initialization ───────────────────────────────────────────────────────────
// Session init is eager — starts on first page load regardless of whether a
// summary block is present. This warms the model early and keeps the footer
// status indicator up-to-date at all times.

htmx.onLoad((root) => {
  void ensureSession();

  root
    .querySelectorAll<HTMLElement>(".js-ai-summary[data-ai-kind]")
    .forEach((el) => {
      if (el.dataset.aiInit === "1") return;
      el.dataset.aiInit = "1";
      renderBlockState(el);
    });

  initBlockSummaries(root);
});
