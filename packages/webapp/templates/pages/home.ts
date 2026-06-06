import { esc, html } from "../../html";
import { partyColor, partyShortName } from "../components/party";

export const HOME_TITLE = "Etusivu";

// ── View-model types ──────────────────────────────────────────────────────────

interface PartyInfo {
  party_code: string;
  party_display_code: string;
  party_name: string;
  member_count: number;
  is_in_government: number;
}

interface CloseVote {
  id: number;
  title: string;
  section_title: string;
  n_yes: number;
  n_no: number;
  margin: number;
  start_time: string;
  session_key: string;
}

interface SpeakerActivity {
  person_id: number;
  first_name: string;
  last_name: string;
  party: string;
  speech_count: number;
  total_words: number;
}

export interface HomeData {
  latestDay: {
    date: string | null;
    sessions: Array<{
      key: string;
      voting_count: number;
      section_count: number;
    }>;
  };
  composition: {
    totalMembers: number;
    governmentMembers: number;
    oppositionMembers: number;
    partyCount: number;
    parties: PartyInfo[];
  };
  signals: {
    closeVotes: CloseVote[];
    speechActivity: SpeakerActivity[];
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function partyDisplayName(p: PartyInfo): string {
  return partyShortName(p.party_display_code);
}

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

// ── Sub-sections ──────────────────────────────────────────────────────────────

function renderBlocBar(parties: PartyInfo[], total: number): string {
  const govParties = parties.filter(
    (p) => p.is_in_government === 1 && p.party_display_code !== "unknown",
  );
  const oppParties = parties.filter(
    (p) => p.is_in_government !== 1 && p.party_display_code !== "unknown",
  );

  const govSegs = govParties
    .map(
      (p) =>
        html`<span class="seg-hall" style="width:${pct(p.member_count, total)};background:${partyColor(p.party_display_code)}" title="${esc(partyDisplayName(p))} ${esc(p.member_count)}"></span>`,
    )
    .join("");
  const oppSegs = oppParties
    .map(
      (p) =>
        html`<span class="seg-opp" style="width:${pct(p.member_count, total)};background:${partyColor(p.party_display_code)}" title="${esc(partyDisplayName(p))} ${esc(p.member_count)}"></span>`,
    )
    .join("");

  const govTotal = govParties.reduce((s, p) => s + p.member_count, 0);
  const oppTotal = oppParties.reduce((s, p) => s + p.member_count, 0);

  return html`<div class="bloc-bar" style="margin-top:18px">${govSegs}${oppSegs}</div>
<div class="bloc-legend">
  <span class="item"><span class="swatch" style="background:var(--hall)"></span>Hallitus <b>${govTotal}</b></span>
  <span class="item"><span class="swatch" style="background:var(--opp)"></span>Oppositio <b>${oppTotal}</b></span>
  <span class="note">${total} paikkaa · ${govParties.length + oppParties.length} puoluetta</span>
</div>`;
}

function renderPartyTable(parties: PartyInfo[], total: number): string {
  const visible = parties
    .filter((p) => p.party_display_code !== "unknown" && p.member_count > 0)
    .sort((a, b) => b.member_count - a.member_count);

  const rows = visible
    .map((p) => {
      const color = partyColor(p.party_display_code);
      const name = partyDisplayName(p);
      const bloc = p.is_in_government === 1 ? "Hallitus" : "Oppositio";
      const widthPct = pct(p.member_count, total);

      return html`<tr>
      <td class="pt-dot"><span style="background:${color}"></span></td>
      <td class="pt-name">${esc(name)} <small>${esc(bloc)}</small></td>
      <td class="pt-bar"><div class="track"><div class="fill" style="width:${widthPct};background:${color}"></div></div></td>
      <td class="pt-seats">${p.member_count}</td>
    </tr>`;
    })
    .join("");

  return html`<table class="party-table">${rows}</table>`;
}

function renderCloseVotesRail(votes: CloseVote[]): string {
  if (votes.length === 0) return "";

  const items = votes
    .map((v) => {
      const passed = v.n_yes >= v.n_no;
      const badge = passed ? "jaa" : "";
      const badgeText = passed ? "JAA" : "EI";
      const resultText = `${v.n_yes} JAA – ${v.n_no} EI`;
      const title = v.title || v.section_title;

      return html`<div class="vote-row">
  <div class="vote-row__badge ${badge}">${badgeText}</div>
  <div>
    <div class="vote-row__title">${esc(title)}</div>
    <div class="vote-row__sub">
      <span class="date">${formatDateTime(v.start_time)}</span>
      <span>${esc(v.section_title)}</span>
    </div>
  </div>
  <div class="vote-row__result">
    <div class="r-line">${esc(resultText)}</div>
    <div class="r-line"><span class="${passed ? "pass" : "fail"}">${v.margin} ään. ero</span></div>
  </div>
</div>`;
    })
    .join("");

  return html`<div class="psec">
  <div class="psec__h"><h2>Tiukimmat äänestykset</h2></div>
  <div class="dissent">${items}</div>
</div>`;
}

function renderSpeechActivityRail(speakers: SpeakerActivity[]): string {
  if (speakers.length === 0) return "";

  const items = speakers
    .map((s) => {
      const color = partyColor(s.party);
      const shortParty = partyShortName(s.party);
      const name = `${s.last_name}, ${s.first_name}`;
      return html`<div class="rail__item">
  <div class="rail__title"><span style="display:inline-flex;align-items:center;gap:8px;margin-right:4px"><span style="background:${color};width:10px;height:10px;border-radius:50%;display:inline-block;flex:0 0 auto"></span></span>${esc(name)}</div>
  <div class="rail__meta">${esc(shortParty)} · ${esc(s.speech_count)} puheenvuoroa</div>
</div>`;
    })
    .join("");

  return html`<div class="psec" style="margin-top:32px">
  <div class="psec__h"><h2>Eniten puheenvuoroja</h2></div>
  <div class="rail" style="margin-top:12px">${items}</div>
</div>`;
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderHome(data?: HomeData): string {
  if (!data) {
    return html`<title>Etusivu — Eduskuntapeili</title>
<div class="wrap"><section class="lead">
  <p class="kicker kicker--red"><span class="dot"></span>Eduskunta juuri nyt</p>
  <h1>Avoin näkymä Suomen parlamentin toimintaan</h1>
  <div class="lead__meta"><span>Ladataan tietoja…</span></div>
</section></div>`;
  }

  const { composition, latestDay, signals } = data;
  const latestSession = latestDay.sessions[0];

  const leadMeta = latestDay.date
    ? html`<span>Viimeisin istunto <b>${latestSession ? esc(latestSession.key) : ""}</b></span>
      <span class="sep"></span>
      <span>${formatDate(latestDay.date)}</span>
      ${latestSession?.voting_count ? html`<span class="sep"></span><span>${latestSession.voting_count} äänestystä</span>` : ""}
      <span class="link-arrow" style="margin-left:auto"><a href="/istunnot">Avaa istunnot →</a></span>`
    : html`<span>Edustajat · äänestykset · istunnot · asiakirjat</span>`;

  return html`<title>Etusivu — Eduskuntapeili</title>

<div class="wrap"><section class="lead">
  <p class="kicker kicker--red"><span class="dot"></span>Eduskunta juuri nyt</p>
  <h1>Avoin näkymä Suomen parlamentin toimintaan</h1>
  <div class="lead__meta">${leadMeta}</div>
</section></div>

<div class="wrap"><hr class="rule" /></div>

<div class="wrap" style="padding-top:24px;padding-bottom:24px">
  <div class="stat-row">
    <div class="stat"><div class="stat__label">Kansanedustajia</div><div class="stat__value">${composition.totalMembers}</div></div>
    <div class="stat"><div class="stat__label">Hallituksessa</div><div class="stat__value hall">${composition.governmentMembers}</div></div>
    <div class="stat"><div class="stat__label">Oppositiossa</div><div class="stat__value opp">${composition.oppositionMembers}</div></div>
    <div class="stat"><div class="stat__label">Puolueita</div><div class="stat__value">${composition.partyCount}</div></div>
  </div>
</div>

<div class="wrap"><hr class="rule" /></div>

<section class="home-main wrap">
  <div>
    <p class="kicker">Voimasuhteet</p>
    <div style="display:flex;align-items:center;justify-content:space-between">
      <h2 style="font-size:var(--fs-h2)">Kokoonpano ja blokit</h2>
      <a class="link-arrow" href="/puolueet">Avaa puolueet →</a>
    </div>
    ${renderBlocBar(composition.parties, composition.totalMembers)}
    ${renderPartyTable(composition.parties, composition.totalMembers)}
  </div>
  <div>
    ${renderCloseVotesRail(signals.closeVotes)}
    ${renderSpeechActivityRail(signals.speechActivity)}
  </div>
</section>`;
}
