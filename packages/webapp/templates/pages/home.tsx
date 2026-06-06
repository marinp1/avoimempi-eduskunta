/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import Kicker from "../components/kicker";
import {
  type HomeData,
  esc,
  formatDate,
  partyColor,
  partyShortName,
  pct,
} from "../helpers";

interface Props {
  /** Page `<title>` suffix. */
  title?: string;
  /** Aggregated data for the overview; when null shows a loading state. */
  data?: HomeData;
  /** Currently selected cursor date (ISO), used for time-reactive content. */
  cursor?: string;
  /** Number of sessions in the term up to and including the cursor date. */
  sessionCount?: number;
}

/** Home / dashboard page — parliament overview, composition, close votes, speaker activity. */
export default function Home({ title, data, sessionCount }: Props) {
  return (
    <>
      <title>{title} — Eduskuntapeili</title>

      <div
        id="tl-reactive"
        class="loading-overlay"
        hx-get="/"
        hx-trigger="tl:commit from:document"
        hx-include="#tl-date-input"
        hx-swap="outerHTML"
        hx-push-url="true"
        hx-indicator="#tl-reactive"
      >
        <div class="htmx-indicator loading-spinner">Ladataan…</div>
        <div class="wrap">
          <section class="lead">
            <p class="kicker kicker--red" data-tl-kicker>
              <span class="dot"></span>Eduskunta juuri nyt
            </p>
            <h1 data-tl-headline>Avoin näkymä Suomen parlamentin toimintaan</h1>
            <div class="lead__meta">
              {data?.latestDay?.date ? (
                <>
                  {(() => {
                    const s = data.latestDay.sessions[0];
                    return (
                      <>
                        <span>
                          <span data-tl-sessionlabel>Viimeisin istunto</span>{" "}
                          <b data-tl-session>{esc(s?.key ?? "")}</b>
                        </span>
                        <span class="sep"></span>
                        <span data-tl-datetime>
                          {formatDate(data.latestDay.date)}
                        </span>
                        {s?.voting_count ? (
                          <>
                            <span class="sep"></span>
                            <span data-tl-agenda>
                              {s.voting_count} äänestystä
                            </span>
                          </>
                        ) : null}
                        <span class="link-arrow ml-auto">
                          <a href="/istunnot">Avaa istunnot →</a>
                        </span>
                      </>
                    );
                  })()}
                </>
              ) : (
                <span>Edustajat · äänestykset · istunnot · asiakirjat</span>
              )}
            </div>
          </section>
        </div>

        {data ? (
          <HomeBody data={data} sessionCount={sessionCount} />
        ) : (
          <div class="wrap">
            <p class="pv-40 text-muted">Ladataan tietoja…</p>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Returns only the `#tl-reactive` fragment, used for htmx partial updates
 * when the time cursor changes.
 */
export function HomeReactive({
  data,
  sessionCount,
}: {
  data?: HomeData;
  cursor?: string;
  sessionCount?: number;
}) {
  return (
    <div
      id="tl-reactive"
      class="loading-overlay"
      hx-get="/"
      hx-trigger="tl:commit from:document"
      hx-include="#tl-date-input"
      hx-swap="outerHTML"
      hx-push-url="true"
      hx-indicator="#tl-reactive"
    >
      <div class="htmx-indicator loading-spinner">Ladataan…</div>
      {data ? (
        <HomeBody data={data} sessionCount={sessionCount} />
      ) : (
        <div class="wrap">
          <p style="padding:40px 0;color:var(--muted)">Ladataan tietoja…</p>
        </div>
      )}
    </div>
  );
}

/** Renders the home page body when data is available. */
export function HomeBody({
  data,
  sessionCount,
}: {
  data: HomeData;
  sessionCount?: number;
}) {
  const comp = data.composition;
  const govParties = comp.parties.filter(
    (p) => p.is_in_government === 1 && p.party_display_code !== "unknown",
  );
  const oppParties = comp.parties.filter(
    (p) => p.is_in_government !== 1 && p.party_display_code !== "unknown",
  );
  const visParties = comp.parties
    .filter((p) => p.party_display_code !== "unknown" && p.member_count > 0)
    .sort((a, b) => b.member_count - a.member_count);
  const govTotal = govParties.reduce((s, p) => s + p.member_count, 0);
  const oppTotal = oppParties.reduce((s, p) => s + p.member_count, 0);
  const closeVotes = data.signals.closeVotes;
  const speakers = data.signals.speechActivity;

  return (
    <>
      <hr class="rule" />

      <div class="wrap">
        <div class="stat-row">
          <div class="stat">
            <div class="stat__label">Kansanedustajat</div>
            <div class="stat__value">{comp.totalMembers}</div>
          </div>
          <div class="stat">
            <div class="stat__label">Hallitus</div>
            <div class="stat__value hall" data-tl-hall>
              {govTotal}
            </div>
          </div>
          <div class="stat">
            <div class="stat__label">Oppositio</div>
            <div class="stat__value opp" data-tl-opp>
              {oppTotal}
            </div>
          </div>
          <div class="stat">
            <div class="stat__label">Istuntoja kaudella</div>
            <div class="stat__value" data-tl-statval>
              {sessionCount ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <hr class="rule" />

      <div class="home-main wrap">
        <div>
          <Kicker text="Poliittinen kokoonpano" />

          <div class="bloc-bar mt-18">
            {govParties.map((p) => (
              <span
                class="seg-hall"
                style={`width:${pct(p.member_count, comp.totalMembers)};background:${partyColor(p.party_display_code)}`}
                title={`${partyShortName(p.party_display_code)} ${p.member_count}`}
              ></span>
            ))}
            {oppParties.map((p) => (
              <span
                class="seg-opp"
                style={`width:${pct(p.member_count, comp.totalMembers)};background:${partyColor(p.party_display_code)}`}
                title={`${partyShortName(p.party_display_code)} ${p.member_count}`}
              ></span>
            ))}
          </div>

          <div class="bloc-legend">
            <span class="item">
              <span class="swatch" style="background:var(--hall)"></span>
              Hallitus <b>{govTotal}</b>
            </span>
            <span class="item">
              <span class="swatch" style="background:var(--opp)"></span>
              Oppositio <b>{oppTotal}</b>
            </span>
            <span class="note">
              {comp.totalMembers} paikkaa ·{" "}
              {govParties.length + oppParties.length} puoluetta
            </span>
          </div>

          <table class="party-table">
            {visParties.map((p) => {
              const color = partyColor(p.party_display_code);
              const name = partyShortName(p.party_display_code);
              const bloc = p.is_in_government === 1 ? "Hallitus" : "Oppositio";
              const widthPct = pct(p.member_count, comp.totalMembers);
              return (
                <tr>
                  <td class="pt-dot">
                    <span style={`background:${color}`}></span>
                  </td>
                  <td class="pt-name">
                    {name} <small>{bloc}</small>
                  </td>
                  <td class="pt-bar">
                    <div class="track">
                      <div
                        class="fill"
                        style={`width:${widthPct};background:${color}`}
                      ></div>
                    </div>
                  </td>
                  <td class="pt-seats">{p.member_count}</td>
                </tr>
              );
            })}
          </table>

          {closeVotes.length > 0 && (
            <div class="psec mt-32">
              <div class="psec__h">
                <h2>Tiukimmat äänestykset</h2>
                <small class="kicker">vaalikausi tähän mennessä</small>
              </div>
              <div class="dissent">
                {closeVotes.map((v) => {
                  const passed = v.n_yes >= v.n_no;
                  const resultText = `${v.n_yes} JAA – ${v.n_no} EI`;
                  const voteTitle = esc(v.title || v.section_title);
                  return (
                    <div class="vote-row">
                      <div class={clsx("vote-row__badge", { jaa: passed })}>
                        {passed ? "JAA" : "EI"}
                      </div>
                      <div>
                        <div class="vote-row__title">{voteTitle}</div>
                        <div class="vote-row__sub">
                          <span class="date">{formatDate(v.start_time)}</span>
                          <span>{esc(v.section_title)}</span>
                        </div>
                      </div>
                      <div class="vote-row__result">
                        <div class="r-line">{resultText}</div>
                        <div class="r-line">
                          <span class={clsx(passed ? "pass" : "fail")}>
                            {v.margin} ään. ero
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div>
          {speakers.length > 0 && (
            <div class="psec">
              <div class="psec__h">
                <h2>Eniten puheenvuoroja</h2>
              </div>
              <div class="rail mt-12">
                {speakers.map((s) => {
                  const color = partyColor(s.party);
                  const shortParty = partyShortName(s.party);
                  const name = `${esc(s.last_name)}, ${esc(s.first_name)}`;
                  return (
                    <div class="rail__item">
                      <div class="rail__title">
                        <span class="flex-inline" style="margin-right:4px">
                          <span
                            class="party-dot"
                            style={`background:${color}`}
                          ></span>
                        </span>
                        {name}
                      </div>
                      <div class="rail__meta">
                        {shortParty} · {s.speech_count} puheenvuoroa
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
