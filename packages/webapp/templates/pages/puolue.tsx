/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";
import Tag from "../components/tag";
import { esc } from "../helpers";
import type { PartyDetailData } from "./puolue-view-model";

interface Props {
  title?: string;
  data: PartyDetailData;
}

export default function Puolue({ title, data }: Props) {
  const p = data.party;
  const coh = data.cohesion;

  return (
    <>
      <title>{title} — Eduskuntapeili</title>

      <div class="wrap">
        <div style="padding-top:16px;font-size:13px;color:var(--muted)">
          <a href="/puolueet" style="color:var(--blue)">
            Puolueet
          </a>
          &nbsp;›&nbsp; <span>{esc(p.name)}</span>
        </div>

        <section class="bio-head">
          <div class="bio-portrait">
            <span class="initials" style="font-size:30px">
              {esc(p.shortName)}
            </span>
            <span class="pbar" style={`background:${p.color}`}></span>
          </div>
          <div class="bio-head__main">
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px">
              <Tag
                text={p.bloc === "government" ? "Hallitus" : "Oppositio"}
                modifier={p.bloc === "government" ? "hall" : "opp"}
              />
            </div>
            <h1 class="bio-name">{esc(p.name)}</h1>
            <div class="bio-meta">
              <span>{esc(p.name)} eduskuntaryhmä</span>
              <span class="sep"></span>
              {p.chairName && (
                <>
                  <span>
                    pj. <b style="color:var(--ink)">{esc(p.chairName)}</b>
                  </span>
                  <span class="sep"></span>
                </>
              )}
              <span>
                {p.seatCount} / {200} paikkaa
              </span>
              <span class="sep"></span>
              {p.govtSince && (
                <span>hallituksessa vuodesta {esc(p.govtSince)}</span>
              )}
            </div>
          </div>
        </section>

        <div class="bio-stats">
          <div class="bio-stat">
            <div class="k">Paikkoja eduskunnassa</div>
            <div class="v">
              {p.seatCount} <small>{p.seatShare}</small>
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">Ryhmäkuri äänestyksissä</div>
            <div class="v">
              {coh.pct != null ? coh.pct : "–"}
              {coh.pct != null ? <small>%</small> : null}
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">Läsnäolo keskimäärin</div>
            <div class="v">
              {p.avgAttendance ?? "–"}
              {p.avgAttendance ? <small>%</small> : null}
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">Edustajien ikä ka.</div>
            <div class="v">
              {p.avgAge ?? "–"}
              {p.avgAge ? <small>v</small> : null}
            </div>
          </div>
        </div>

        <div class="bio-grid">
          <div>
            {p.bloc === "government" && (
              <div class="ai">
                <div class="ai__head">
                  <span class="ai__spark">✦</span>
                  <span class="ai__label">Tekoälykooste · millainen ryhmä</span>
                </div>
                <p class="ai__body">
                  Tekoälykoostetta ei ole vielä saatavilla tälle ryhmälle.
                </p>
                <div class="ai__foot">
                  <span>Koneellisesti tuotettu kooste ryhmän profiilista.</span>
                </div>
              </div>
            )}

            {coh.pct != null && (
              <section class="psec" style="margin-top:28px">
                <Kicker
                  text="Ryhmäkuri · äänestysyhtenäisyys"
                  modifier="blue"
                  dot
                />
                <h2>{coh.label}</h2>
                <div class="vote-bar" style="margin-top:14px">
                  <span class="v-jaa" style={`width:${coh.pct}%`}>
                    Yhtenäinen {coh.pct}%
                  </span>
                  <span class="v-ei" style={`width:${100 - coh.pct}%`}></span>
                </div>
                <div class="vote-legend" style="margin-top:10px">
                  <div class="vl">
                    <span class="sw" style="background:var(--hall)"></span>
                    <div>
                      <span class="vk">Yhtenäinen</span>
                      <span class="vv">{coh.pct}%</span>
                    </div>
                  </div>
                  <div class="vl">
                    <span class="sw" style="background:var(--red)"></span>
                    <div>
                      <span class="vk">Hajaantunut</span>
                      <span class="vv">{100 - coh.pct}%</span>
                    </div>
                  </div>
                </div>

                {data.splitVotes.length > 0 && (
                  <>
                    <p style="margin-top:22px;font-size:14.5px;color:var(--body);line-height:1.5">
                      Eniten hajaannusta aiheuttaneet äänestykset:
                    </p>
                    {data.splitVotes.map((v) => (
                      <a
                        href={`/aanestys/${v.id}`}
                        hx-get={`/aanestys/${v.id}`}
                        hx-target="#main-content"
                        hx-push-url="true"
                        hx-swap="innerHTML"
                        class="vote-row"
                      >
                        <span
                          class={`vote-row__badge ${v.nYes > v.nNo ? "jaa" : ""}`}
                        >
                          {v.nYes > v.nNo ? "JAA" : "EI"}
                        </span>
                        <span class="vote-row__info">
                          <span class="vote-row__title">{esc(v.title)}</span>
                          <span class="vote-row__sub">{v.date}</span>
                        </span>
                        <span class="vote-row__result">
                          <span class="r-line">
                            {v.nYes}–{v.nNo}
                          </span>
                        </span>
                      </a>
                    ))}
                  </>
                )}
              </section>
            )}

            <section class="psec" style="margin-top:28px">
              <Kicker text="Jäsenet · kansanedustajat" modifier="blue" dot />
              <div class="mp-list">
                {data.members.map((m) => (
                  <a
                    href={`/edustaja/${m.id}`}
                    hx-get={`/edustaja/${m.id}`}
                    hx-target="#main-content"
                    hx-push-url="true"
                    hx-swap="innerHTML"
                    class="mp-row"
                  >
                    <span class="mp-row__av" style={`--p:${m.color}`}>
                      {esc(m.firstName.charAt(0))}
                      {esc(m.lastName.charAt(0))}
                    </span>
                    <span class="mp-row__main">
                      <span class="mp-row__name">
                        {esc(m.firstName)} {esc(m.lastName)}
                      </span>
                      <span class="mp-row__dist">{esc(m.district)}</span>
                    </span>
                    <span class="mp-row__go">→</span>
                  </a>
                ))}
              </div>
            </section>

            {data.committeeChairs.length > 0 && (
              <section class="psec" style="margin-top:28px">
                <Kicker
                  text="Valiokunnat · puheenjohtajuudet"
                  modifier="blue"
                  dot
                />
                {data.committeeChairs.map((cc) => (
                  <div class="committee-row">
                    <span class="committee-row__name">{esc(cc.committee)}</span>
                    <span class="committee-row__role">{esc(cc.name)}</span>
                  </div>
                ))}
              </section>
            )}
          </div>

          <div>
            <section class="psec">
              <Kicker text="Faktat" modifier="blue" dot />
              <dl style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
                <div>
                  <dt style="font-family:var(--mono);font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">
                    Sukupuolijakauma
                  </dt>
                  <dd style="font-size:14px;color:var(--ink);margin:4px 0 0">
                    {p.femaleCount} naista · {p.maleCount} miestä
                  </dd>
                </div>
                <div>
                  <dt style="font-family:var(--mono);font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">
                    Keski-ikä
                  </dt>
                  <dd style="font-size:14px;color:var(--ink);margin:4px 0 0">
                    {p.avgAge ?? "–"} vuotta
                  </dd>
                </div>
                <div>
                  <dt style="font-family:var(--mono);font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">
                    Asema
                  </dt>
                  <dd style="font-size:14px;color:var(--ink);margin:4px 0 0">
                    {p.bloc === "government"
                      ? "Hallituspuolue"
                      : "Oppositiopuolue"}
                  </dd>
                </div>
              </dl>
            </section>

            {data.topics.length > 0 && (
              <section class="psec" style="margin-top:28px">
                <Kicker text="Aiheet · mistä puhuu" modifier="blue" dot />
                <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:14px">
                  {data.topics.map((t) => (
                    <span class="topic-tag">{esc(t)}</span>
                  ))}
                </div>
              </section>
            )}

            {data.recentSpeeches.length > 0 && (
              <section class="psec" style="margin-top:28px">
                <Kicker text="Viimeisimmät puheenvuorot" modifier="blue" dot />
                {data.recentSpeeches.map((sp) => (
                  <div class="spoke-row">
                    <span class="spoke-row__name">
                      {esc(sp.name)} <small>{esc(sp.partyCode)}</small>
                    </span>
                    <span class="spoke-row__title">{esc(sp.title)}</span>
                    <span class="spoke-row__date">{sp.date}</span>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>

        <div class="source-note" style="margin-top:32px">
          <span>Lähde:</span>
          <span class="dset">
            Eduskunnan avoin data · MemberOfParliament + Voting
          </span>
          <span>·</span>
          <span class="fresh">haettu {data.fetchedAt}</span>
        </div>
      </div>
    </>
  );
}
