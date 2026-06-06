/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import Kicker from "../components/kicker";
import { esc } from "../helpers";
import type { SingleVoteData } from "./aanestys-view-model";

interface Props {
  title?: string;
  data: SingleVoteData;
}

export default function Aanestys({ title, data }: Props) {
  const v = data.vote;

  return (
    <>
      <title>{v.title || title} — Äänestys — Eduskuntapeili</title>

      <div class="wrap">
        <div style="padding-top:16px;font-size:13px;color:var(--muted)">
          <a href="/aanestykset" style="color:var(--blue)">
            Äänestykset
          </a>
          &nbsp;›&nbsp;{" "}
          <a href={`/istunto/${esc(v.sessionKey)}`} style="color:var(--blue)">
            Täysistunto {esc(v.sessionKey)}
          </a>
          &nbsp;›&nbsp; <span>Äänestys {v.votingNumber}</span>
        </div>

        <section class="doc-head">
          <div class="doc-head__top">
            <span class="doc-id">
              Äänestys {v.votingNumber} · PTK {esc(v.sessionKey)} vp
            </span>
            <span class="doc-type">
              {v.titleExtra ?? "Täysistunnon äänestys"}
            </span>
            <span
              class={clsx("tag", `tag--${v.outcome === "ok" ? "hall" : "opp"}`)}
              style="margin-left:auto"
            >
              {v.outcomeLabel}
            </span>
          </div>
          <h1>{esc(v.title)}</h1>
          <div class="sess-meta">
            <span>
              <b>{v.dateLabel}</b>
            </span>
            <span class="sep"></span>
            <span>{v.time}</span>
            {v.sectionKey && (
              <>
                <span class="sep"></span>
                <a
                  href={`/asiakohta/${esc(v.sectionKey)}`}
                  style="color:var(--blue)"
                >
                  Asiakohta {v.asiakohtaNum}
                </a>
              </>
            )}
            <span class="sep"></span>
            <a href={`/istunto/${esc(v.sessionKey)}`} style="color:var(--blue)">
              Avaa istunto ↗
            </a>
          </div>
        </section>

        <div class="doc-toolbar">
          {v.sectionKey && (
            <a href={`/asiakohta/${esc(v.sectionKey)}`} class="tbtn">
              <span class="ic">▤</span>Asiakohta {v.asiakohtaNum}
            </a>
          )}
          <a href="#ryhmat" class="tbtn">
            <span class="ic">▤</span>Ryhmittäin
          </a>
          <a href="#kartta" class="tbtn">
            <span class="ic">▦</span>Edustajakartta
          </a>
          <span class="grow"></span>
          <button class="tbtn">
            <span class="ic">⧉</span>Jaa
          </button>
        </div>

        <section class="vresult" id="vresult">
          <div class="vresult__q">
            {v.yesProposition && (
              <span class="prop">
                <span class="k j">JAA</span>
                {esc(v.yesProposition)}
              </span>
            )}
            {v.noProposition && (
              <span class="prop">
                <span class="k e">EI</span>
                {esc(v.noProposition)}
              </span>
            )}
          </div>
          <div class="vote-bar" style="margin-top:16px">
            <span class="v-jaa" style={`width:${v.yesPct.toFixed(1)}%`}>
              JAA {v.nYes}
            </span>
            <span class="v-ei" style={`width:${v.noPct.toFixed(1)}%`}>
              EI {v.nNo}
            </span>
            {v.nEmpty > 0 && (
              <span
                class="v-tyh"
                style={`width:${v.emptyPct.toFixed(1)}%`}
              ></span>
            )}
            <span class="v-poi" style={`width:${v.absentPct.toFixed(1)}%`}>
              Poissa {v.nAbsent}
            </span>
          </div>
          <div class="vote-legend">
            <div class="vl">
              <span class="sw" style="background:var(--hall)"></span>
              <div>
                <span class="vk">Jaa</span>
                <span class="vv">{v.nYes}</span>
              </div>
            </div>
            <div class="vl">
              <span class="sw" style="background:var(--red)"></span>
              <div>
                <span class="vk">Ei</span>
                <span class="vv">{v.nNo}</span>
              </div>
            </div>
            {v.nEmpty > 0 && (
              <div class="vl">
                <span class="sw" style="background:var(--opp)"></span>
                <div>
                  <span class="vk">Tyhjää</span>
                  <span class="vv">{v.nEmpty}</span>
                </div>
              </div>
            )}
            <div class="vl">
              <span class="sw" style="background:var(--paper-3)"></span>
              <div>
                <span class="vk">Poissa</span>
                <span class="vv">{v.nAbsent}</span>
              </div>
            </div>
          </div>
          <div class="decision" style="margin-top:18px">
            <div class="decision__icon">{v.outcome === "ok" ? "✓" : "✗"}</div>
            <div class="decision__main">
              <div class="t">
                {v.outcomeLabel}, {v.nYes}–{v.nNo}
              </div>
            </div>
          </div>
        </section>

        <div class="summary" style="margin-top:24px">
          <div class="summary__bar">
            <span class="l">
              <span class="spark">✦</span>
              <span class="lbl">Tekoälykooste · mitä tulos tarkoittaa</span>
            </span>
          </div>
          <div class="summary__in">
            <div class="summary__q">Mitä tulos tarkoittaa?</div>
            <p class="summary__lead">
              Tekoälykoostetta ei ole vielä saatavilla tälle äänestykselle.
            </p>
            <div class="summary__foot">
              <span class="summary__disc">
                Koneellisesti tuotettu tulkinta äänestystuloksesta.
              </span>
            </div>
          </div>
        </div>

        <section id="ryhmat" style="margin-top:28px;scroll-margin-top:14px">
          <Kicker
            text="Ryhmittäin · äänestyskäyttäytyminen"
            modifier="blue"
            dot
          />
          <div class="vote-block">
            <div class="vote-block__h">
              <span class="vote-block__title">Eduskuntaryhmät</span>
            </div>
            {data.partyBreakdown.map((pb) => (
              <div class="pvote">
                <div class="pvote__name">
                  <span class="d" style={`background:${pb.partyColor}`}></span>
                  {esc(pb.partyName)}
                </div>
                <div class="pvote__bar">
                  <span
                    class="j"
                    style={`width:${pb.nTotal > 0 ? ((pb.nYes / pb.nTotal) * 100).toFixed(1) : 0}%`}
                  ></span>
                  <span
                    class="e"
                    style={`width:${pb.nTotal > 0 ? ((pb.nNo / pb.nTotal) * 100).toFixed(1) : 0}%`}
                  ></span>
                  <span
                    class="a"
                    style={`width:${pb.nTotal > 0 ? (((pb.nEmpty + pb.nAbsent) / pb.nTotal) * 100).toFixed(1) : 0}%`}
                  ></span>
                </div>
                <div class="pvote__num">
                  <b>{pb.nYes}</b>–{pb.nNo}
                  {pb.nEmpty > 0 ? ` · ${pb.nEmpty}` : ""}
                  {pb.nAbsent > 0 ? ` · ${pb.nAbsent} poissa` : ""}
                </div>
              </div>
            ))}
          </div>
        </section>

        <SectionKartta data={data} />

        {data.relatedVotes.length > 0 && (
          <section style="margin-top:28px">
            <Kicker
              text="Samasta asiasta · muut äänestykset"
              modifier="blue"
              dot
            />
            <div class="ag-votes" style="margin-top:4px">
              {data.relatedVotes.map((rv) => (
                <a
                  href={`/aanestys/${rv.id}`}
                  hx-get={`/aanestys/${rv.id}`}
                  hx-target="#main-content"
                  hx-push-url="true"
                  hx-swap="innerHTML"
                  class="agvote"
                >
                  <div class="agvote__t">{esc(rv.title)}</div>
                  <div class="agvote__bar">
                    <span
                      class="j"
                      style={`width:${rv.nYes > 0 ? 50 : 0}%`}
                    ></span>
                    <span
                      class="e"
                      style={`width:${rv.nNo > 0 ? 50 : 0}%`}
                    ></span>
                  </div>
                  <div class="agvote__n">
                    <span class="j">{rv.nYes}</span>–
                    <span class="e">{rv.nNo}</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <div class="source-note" style="margin-top:32px">
          <span>Lähde:</span>
          <span class="dset">
            Eduskunnan avoin data · SaliDBAanestys + Vote
          </span>
          <span>·</span>
          <span class="fresh">haettu {data.fetchedAt}</span>
        </div>
      </div>
    </>
  );
}

function SectionKartta({ data }: { data: SingleVoteData }) {
  return (
    <section id="kartta" style="margin-top:28px;scroll-margin-top:14px">
      <Kicker text="Edustajakartta · miten kukin äänesti" modifier="blue" dot />
      <div class="attend__grid" style="margin-top:14px">
        <div class="mlookup">
          <label class="search" style="margin-bottom:0">
            <span class="ic">⌕</span>
            <input id="mp-search" type="text" placeholder="Hae edustajalla…" />
          </label>
          <div class="mlist" id="mp-list">
            {data.mpVotes.map((mp) => (
              <div
                class="mvote"
                data-search={`${mp.firstName} ${mp.lastName} ${mp.partyCode}`.toLowerCase()}
              >
                <span class="mn">
                  {esc(mp.firstName)} {esc(mp.lastName)}
                  <small>{esc(mp.partyCode)}</small>
                </span>
                <span
                  class={`mb ${mp.vote === "jaa" ? "j" : mp.vote === "ei" ? "e" : mp.vote === "tyhjaa" ? "tyh" : "out"}`}
                >
                  {mp.vote === "jaa"
                    ? "JAA"
                    : mp.vote === "ei"
                      ? "EI"
                      : mp.vote === "tyhjaa"
                        ? "TYHJÄÄ"
                        : "POISSA"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div class="seatwrap">
          <div class="seatgrid" id="vote-seatgrid">
            {data.mpVotes.map((mp) => {
              const seatColor =
                mp.vote === "jaa"
                  ? "var(--hall)"
                  : mp.vote === "ei"
                    ? "var(--red)"
                    : mp.vote === "tyhjaa"
                      ? "var(--opp)"
                      : "transparent";
              const absentClass = mp.vote === "poissa" ? "absent" : "";
              return (
                <span
                  class={`seat ${absentClass}`}
                  style={`--p:${seatColor}`}
                  title={`${esc(mp.firstName)} ${esc(mp.lastName)} (${esc(mp.partyCode)})`}
                ></span>
              );
            })}
          </div>
          <div class="seat-legend">
            <div class="it">
              <span class="d" style="background:var(--hall)"></span>Jaa
            </div>
            <div class="it">
              <span class="d" style="background:var(--red)"></span>Ei
            </div>
            <div class="it">
              <span class="d" style="background:var(--opp)"></span>Tyhjää
            </div>
            <div class="it">
              <span class="d ring"></span>Poissa
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
