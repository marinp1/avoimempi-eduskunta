import htmx from "htmx.org";
import {
  BLOCK_PROFILES,
  buildPartContext,
  findBlockResult,
  resolvePageProfile,
  type SummaryPart,
  type SummaryProfile,
} from "./ai-summary-content";

// ─── Session management ───────────────────────────────────────────────────────
// One Summarizer session per summary profile (type + length + sharedContext),
// cached for the page lifetime and reused across HTMX navigations. The model
// download is shared across sessions, so only the first creation is expensive.
// A global availability state machine drives the footer indicator and the
// per-block UI states.

type SessionState =
  | "idle"
  | "checking"
  | "unsupported"
  | "downloading"
  | "ready"
  | "error";

let sessionState: SessionState = "idle";
let sessionInitPromise: Promise<void> | null = null;

const sessions = new Map<string, Promise<Summarizer>>();

function mainScope(): HTMLElement {
  return document.querySelector<HTMLElement>("#main-content") ?? document.body;
}

function getSession(profile: SummaryProfile): Promise<Summarizer> {
  const key = `${profile.type}|${profile.length}|${profile.sharedContext}`;
  let promise = sessions.get(key);
  if (!promise) {
    promise = Summarizer.create({
      type: profile.type,
      length: profile.length,
      format: "plain-text",
      outputLanguage: "fi",
      expectedInputLanguages: ["fi"],
      sharedContext: profile.sharedContext,
      monitor: (m) => {
        m.addEventListener("downloadprogress", () => {
          if (sessionState !== "ready") {
            sessionState = "downloading";
            refreshAllBlocks();
          }
        });
      },
    });
    sessions.set(key, promise);
    promise.catch(() => sessions.delete(key));
  }
  return promise;
}

function pageProfileFor(el: HTMLElement): SummaryProfile | null {
  return resolvePageProfile(el.dataset.aiKind ?? "", el.dataset.aiSubkind);
}

function warmupProfile(): SummaryProfile {
  const pageEl = document.querySelector<HTMLElement>(
    ".js-ai-summary[data-ai-kind]",
  );
  if (pageEl) {
    const profile = pageProfileFor(pageEl);
    if (profile) return profile;
  }
  const blockEl = document.querySelector<HTMLElement>(
    ".js-ai-block[data-ai-kind]",
  );
  if (blockEl) {
    const profile = BLOCK_PROFILES[blockEl.dataset.aiKind ?? ""];
    if (profile) return profile;
  }
  return BLOCK_PROFILES["speech"]!;
}

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
    type: "key-points",
    format: "plain-text",
    length: "long",
    outputLanguage: "fi",
    expectedInputLanguages: ["fi"],
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
    // Eagerly create the session for the first summary block on the page —
    // this triggers the (one-time) model download and warms the model.
    await getSession(warmupProfile());
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
        '<p class="summary__lead summary__lead--muted">Tekoälykooste vaatii Chrome 138+:n Gemini Nano -malleineen.</p>';
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

async function generateSummary(el: HTMLElement): Promise<void> {
  if (sessionState !== "ready") return;

  const inner = el.querySelector<HTMLElement>(".summary__in");
  if (!inner) return;

  const qEl = inner.querySelector<HTMLElement>(".summary__q");
  const footEl = inner.querySelector<HTMLElement>(".summary__foot");

  const profile = pageProfileFor(el);
  const parts = profile ? profile.collectParts(mainScope(), el) : [];
  if (!profile || parts.length === 0) {
    inner.innerHTML = "";
    if (qEl) inner.appendChild(qEl);
    const naEl = document.createElement("p");
    naEl.className = "summary__lead summary__lead--muted";
    naEl.textContent = "Tekoälykooste ei ole käytettävissä tälle sisällölle.";
    inner.appendChild(naEl);
    if (footEl) inner.appendChild(footEl);
    return;
  }

  const rawContext = el.dataset.aiContext ?? "";

  el.dataset.aiGenerating = "1";

  inner.innerHTML = "";
  if (qEl) inner.appendChild(qEl);

  const resultEl = document.createElement("div");
  resultEl.className = "summary__result";
  inner.appendChild(resultEl);

  if (footEl) inner.appendChild(footEl);

  try {
    const session = await getSession(profile);
    for (const part of parts) {
      if (parts.length > 1 && part.heading) {
        const headingEl = document.createElement("div");
        headingEl.className = "summary__part-h";
        headingEl.textContent = part.heading;
        resultEl.appendChild(headingEl);
      }

      const leadEl = document.createElement("p");
      leadEl.className = "summary__lead summary__lead--streaming";
      leadEl.textContent = "Luodaan kooste…";
      resultEl.appendChild(leadEl);

      const accumulated = await summarizeToString(
        session,
        part,
        profile,
        rawContext,
      );
      leadEl.classList.remove("summary__lead--streaming");
      renderPartResult(profile, resultEl, leadEl, accumulated);
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

async function summarizeToString(
  session: Summarizer,
  part: SummaryPart,
  profile: SummaryProfile,
  rawContext: string,
): Promise<string> {
  const context = buildPartContext(
    part.instruction,
    profile.contextLabel,
    rawContext,
  );
  const stream = session.summarizeStreaming(part.text, { context });
  // The API streams full replacement text per chunk, not deltas — consume
  // silently and do a single DOM update when done.
  const reader = stream.getReader();
  let accumulated = "";
  while (true) {
    const { done, value } = await reader.read();
    if (value) accumulated += value; // skip empty flush chunks; also captures done:true+value
    if (done) break;
  }
  return accumulated;
}

function renderPartResult(
  profile: SummaryProfile,
  container: HTMLElement,
  leadEl: HTMLElement,
  accumulated: string,
): void {
  if (profile.type === "key-points") {
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
      container.appendChild(ul);
    }
    return;
  }

  // Prose profiles: keep paragraph structure, no bullet splitting.
  const paragraphs = accumulated
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  leadEl.textContent = paragraphs[0] ?? accumulated.trim();
  for (const para of paragraphs.slice(1)) {
    const pEl = document.createElement("p");
    pEl.className = "summary__lead";
    pEl.textContent = para;
    container.appendChild(pEl);
  }
}

function parseKeyPoints(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 0);
}

// ─── Block summary generation ─────────────────────────────────────────────────

function initBlockSummaries(root: Document | Element): void {
  root
    .querySelectorAll<HTMLElement>(".js-ai-block[data-ai-kind]")
    .forEach((el) => {
      if (el.dataset.aiBlockInit === "1") return;
      el.dataset.aiBlockInit = "1";
      el.addEventListener("click", () => {
        if (sessionState !== "ready") return;
        void generateBlockSummary(el);
      });
    });
}

async function generateBlockSummary(el: HTMLElement): Promise<void> {
  const profile = BLOCK_PROFILES[el.dataset.aiKind ?? ""];
  if (!profile) return;

  const part = profile.collectParts(mainScope(), el)[0];
  if (!part) return;

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
    const session = await getSession(profile);
    const accumulated = await summarizeToString(
      session,
      part,
      profile,
      el.dataset.aiContext ?? "",
    );
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
