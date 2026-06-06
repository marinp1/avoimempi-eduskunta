/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";
import StatRow from "../components/stat-row";
import Spill from "../components/spill";
import type {
  SessionsIndexData,
  WeekGroup,
  SessionRow,
  Dchip,
} from "./istunnot-view-models";

interface Props {
  title?: string;
  data?: SessionsIndexData;
}

function statusMod(s: "done" | "draft" | "live"): string {
  switch (s) {
    case "live":
      return "live";
    case "done":
      return "done";
    case "draft":
      return "draft";
  }
}

function statusLabel(s: "done" | "draft" | "live"): string {
  switch (s) {
    case "live":
      return "käynnissä";
    case "done":
      return "päättynyt";
    case "draft":
      return "pöytäkirja laadittu";
  }
}

export default function Istunnot({ title, data }: Props) {
  const d = data!;
  return (
    <>
      <title>{title} — Eduskuntapeili</title>

      <div class="wrap">
        <section class="page-head">
          <Kicker text="Täysistunnot" />
          <h1>Istunnot</h1>
          <p class="sub">
            Eduskunnan täysistunnot istuntoviikoittain — mitä käsiteltiin, mistä
            äänestettiin ja mistä keskusteltiin. Jokainen luku avautuu
            alkuperäiseen pöytäkirjaan ja äänestystulokseen.
          </p>
        </section>
      </div>

      <div class="wrap">
        <section style="padding:8px 0 6px">
          <div class="ai">
            <div class="ai__head">
              <span class="ai__spark">✦</span>
              <span class="ai__label">
                Tekoälykooste · istuntoviikko 19.–22.5.2026
              </span>
            </div>
            <p class="ai__body">
              Toukokuun kolmas istuntoviikko huipentui perjantain
              äänestyspäivään: <b>metsälakipaketti hyväksyttiin 149–22</b>,
              sisäisen turvallisuuden selonteon kannanotto 155–13 ja
              hyvinvointialueiden rahoitus niukasti <b>94–77</b>. Keskiviikkona
              äänestettiin kymmenen kertaa — muun muassa ammattikorkeakoulu- ja
              opintotukilaista (91–77) sekä työsopimuslaista (93–78). Torstain
              kyselytunnilla nousivat drooniuhka, Suomen ja Israelin
              puolustusyhteistyö ja vaaratiedotejärjestelmä.
            </p>
            <div class="ai__foot">
              <span class="ai__note">
                Koneellisesti tuotettu · pohjautuu 4 tietueeseen
              </span>
              <button class="ai-sources-toggle" data-label="Näytä lähteet (4)">
                <span class="chev">›</span>
                <span class="lbl">Näytä lähteet (4)</span>
              </button>
            </div>
            <div class="ai-sources">
              <div class="ai-sources__title">
                Koosteen lähteet — tarkistettavissa
              </div>
              <div class="src-row">
                <span class="src-row__n">1</span>
                <div class="src-row__main">
                  <div class="src-row__title">
                    Täysistunnot 2026/51–2026/54 · 4 istuntoa
                  </div>
                  <div class="src-row__api">
                    GET /api/v1/tables/Session/rows?key=2026/51..2026/54
                  </div>
                </div>
                <div class="src-row__meta">
                  22.5.2026
                  <br />
                  <a href="#" target="_blank" rel="noopener">
                    avaa ↗
                  </a>
                </div>
              </div>
              <div class="src-row">
                <span class="src-row__n">2</span>
                <div class="src-row__main">
                  <div class="src-row__title">
                    Äänestykset viikolla · 16 äänestystä, mm. VotingId 56552
                    (metsälaki 149–22)
                  </div>
                  <div class="src-row__api">
                    SELECT * FROM Voting WHERE session_key BETWEEN '2026/51' AND
                    '2026/54'
                  </div>
                </div>
                <div class="src-row__meta">
                  22.5.2026
                  <br />
                  <a href="#" target="_blank" rel="noopener">
                    avaa ↗
                  </a>
                </div>
              </div>
              <div class="src-row">
                <span class="src-row__n">3</span>
                <div class="src-row__main">
                  <div class="src-row__title">
                    Puheenvuorot · {d.weekStats.speechCount} kpl (Speech,
                    session_key 2026/51–54)
                  </div>
                  <div class="src-row__api">
                    SELECT COUNT(*) FROM Speech WHERE session_key LIKE '2026/5%'
                  </div>
                </div>
                <div class="src-row__meta">
                  22.5.2026
                  <br />
                  <a href="#" target="_blank" rel="noopener">
                    avaa ↗
                  </a>
                </div>
              </div>
              <div class="src-row">
                <span class="src-row__n">4</span>
                <div class="src-row__main">
                  <div class="src-row__title">
                    Päiväjärjestykset · Section + Agenda (65 asiakohtaa)
                  </div>
                  <div class="src-row__api">
                    SELECT * FROM Section WHERE session_key BETWEEN '2026/51'
                    AND '2026/54'
                  </div>
                </div>
                <div class="src-row__meta">
                  22.5.2026
                  <br />
                  <a href="#" target="_blank" rel="noopener">
                    avaa ↗
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="wrap">
        <section style="padding:24px 0 4px">
          <Kicker text="Istuntoviikko 19.–22.5.2026 · lukuina" />
          <StatRow
            stats={[
              { label: "Täysistuntoa", value: d.weekStats.sessionCount },
              { label: "Äänestystä", value: d.weekStats.votingCount },
              { label: "Puheenvuoroa", value: d.weekStats.speechCount },
              {
                label: "Istuntoaikaa",
                value: d.weekStats.hours > 0 ? `${d.weekStats.hours} h` : "—",
              },
            ]}
          />
        </section>
      </div>

      <hr class="rule" />

      <SessionList weeks={d.weeks} totalSessions={d.totalSessions} />

      <div class="wrap">
        <div class="source-note">
          <span>Lähde:</span>
          <span class="dset">
            Eduskunnan avoin data · Session + Voting + Speech
          </span>
          <span>·</span>
          <span class="fresh">haettu {d.fetchedAt}</span>
          <span>·</span>
          <span
            class="cite verify"
            data-mark="off"
            data-value="2026/46–2026/55"
            data-caption="Kevätistuntokauden 2026 täysistunnot — viimeisimmät"
            data-set="Eduskunnan avoin data · Session"
            data-table="Session + Voting + Speech + Section"
            data-endpoint="SELECT key, date, state_text_fi, minutes_title FROM Session WHERE type='TAYSISTUN' ORDER BY date DESC"
            data-record={`${d.totalSessions} istuntoa`}
            data-jakso="Vaalikausi 2023–2027"
            data-fetched={d.fetchedAt}
            data-chain="avoindata.eduskunta.fi > Session > Istuntolista"
            data-url="https://avoindata.eduskunta.fi/"
            data-orig="Avaa aineisto"
          >
            varmenna jäljite
          </span>
        </div>
      </div>
    </>
  );
}

export function SessionList({
  weeks,
  totalSessions,
}: {
  weeks: WeekGroup[];
  totalSessions: number;
}) {
  const visibleWeeks = weeks;

  return (
    <div class="wrap">
      <div class="toolbar" hx-boost="true">
        <label class="search">
          <span class="ic">⌕</span>
          <input
            id="sit-search"
            type="text"
            placeholder="Hae istunnoista — laki, aihe tai istuntonumero…"
            name="q"
            hx-get="/istunnot"
            hx-trigger="input changed delay:200ms"
            hx-target="#sit-root"
            hx-push-url="true"
          />
        </label>
        <span class="count">
          <b id="sit-count">{totalSessions}</b> istuntoa
        </span>
      </div>

      <div class="fchips">
        <a
          class="fchip is-active"
          href="/istunnot"
          hx-get="/istunnot"
          hx-target="#sit-root"
          hx-push-url="true"
        >
          Kaikki
        </a>
        <a
          class="fchip"
          href="/istunnot?kind=vote"
          hx-get="/istunnot?kind=vote"
          hx-target="#sit-root"
          hx-push-url="true"
        >
          <span class="pdot" style="background:var(--blue)"></span>
          Äänestyspäivät
        </a>
        <a
          class="fchip"
          href="/istunnot?kind=kysely"
          hx-get="/istunnot?kind=kysely"
          hx-target="#sit-root"
          hx-push-url="true"
        >
          <span class="pdot" style="background:var(--opp)"></span>Kyselytunti
        </a>
        <a
          class="fchip"
          href="/istunnot?kind=vali"
          hx-get="/istunnot?kind=vali"
          hx-target="#sit-root"
          hx-push-url="true"
        >
          <span class="pdot" style="background:var(--red)"></span>Välikysymys
        </a>
        <a
          class="fchip"
          href="/istunnot?kind=talk"
          hx-get="/istunnot?kind=talk"
          hx-target="#sit-root"
          hx-push-url="true"
        >
          <span class="pdot" style="background:var(--faint)"></span>Keskustelut
        </a>
      </div>

      <div id="sit-root">
        {visibleWeeks.map((week) => (
          <section class="week" data-week>
            <div class="week-head">
              <span class="week-head__k">{week.label}</span>
              <span class="week-head__t">{week.dateRange}</span>
              <span class="week-head__meta">{week.meta}</span>
            </div>
            <div class="sit-list">
              {week.sessions.map((s) => (
                <SessionRowComponent session={s} />
              ))}
            </div>
          </section>
        ))}

        <div
          id="sit-empty"
          class="src-row"
          hidden
          style="display:block;text-align:center;color:var(--muted);padding:40px 0;border:0"
        >
          Ei istuntoja näillä hakuehdoilla.
        </div>
      </div>
    </div>
  );
}

function SessionRowComponent({ session }: { session: SessionRow }) {
  return (
    <a
      class="sit-row"
      href={session.href}
      data-kind={session.kind}
      data-text={session.searchText}
    >
      <div class="sit-date">
        <span class="sit-dow">
          <span class={`kdot ${session.dotClass}`}></span>
          {session.dayOfWeek}
        </span>
        <span class="sit-day">{session.dayNum}</span>
        <span class="sit-mon">{session.month}</span>
      </div>
      <div class="sit-main">
        <div class="sit-top">
          <span class="sit-id">{session.sessionId}</span>
          <Spill
            text={statusLabel(session.status)}
            modifier={statusMod(session.status)}
          />
          {session.timeRange && (
            <span class="sit-time">{session.timeRange}</span>
          )}
        </div>
        <div class="sit-head">{session.headline}</div>
        {session.note && <div class="sit-note">{session.note}</div>}
        {session.dchips.length > 0 && (
          <div class="sit-items">
            {session.dchips.map((chip) => (
              <DchipComponent chip={chip} />
            ))}
          </div>
        )}
      </div>
      <div class="sit-meta">
        <div class="sit-figs">
          <div class="sit-fig">
            <b class={session.votingCount === 0 ? "zero" : ""}>
              {session.votingCount}
            </b>
            <span>{session.votingCount === 1 ? "Äänestys" : "Äänestystä"}</span>
          </div>
          <div class="sit-fig">
            <b>{session.sectionCount}</b>
            <span>Asiakohtaa</span>
          </div>
        </div>
        <span class="sit-go">Avaa istunto →</span>
      </div>
    </a>
  );
}

function DchipComponent({ chip }: { chip: Dchip }) {
  if (chip.isMore) {
    return <span class="dchip dchip--more">{chip.text}</span>;
  }
  return (
    <span class="dchip">
      {chip.kind && <span class="dchip__k">{chip.kind}</span>}
      <span class="dchip__t">{chip.text}</span>
      {chip.result && (
        <span class={`dchip__r ${chip.result.class}`}>{chip.result.text}</span>
      )}
    </span>
  );
}
