/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import Kicker from "../components/kicker";
import { esc } from "../helpers";
import type { AsiakohtaData } from "./asiakohta-view-model";

const NAV = {
  "hx-target": "#main-content",
  "hx-push-url": "true",
  "hx-swap": "innerHTML",
} as const;

export default function Asiakohta({
  title: _title,
  data,
}: {
  title?: string;
  data: AsiakohtaData;
}) {
  const sec = data.section;

  return (
    <>
      <title>
        {sec.itemNumber ? `Asiakohta ${sec.itemNumber} · ` : ""}
        {sec.sessionTitle} — Eduskuntapeili
      </title>

      <div class="wrap">
        <div style="padding-top:16px;font-size:13px;color:var(--muted)">
          <a
            href="/istunnot"
            style="color:var(--blue)"
            hx-get="/istunnot"
            {...NAV}
          >
            Istunnot
          </a>
          &nbsp;›&nbsp;{" "}
          <a
            href={`/istunto/${esc(sec.sessionKey)}`}
            style="color:var(--blue)"
            hx-get={`/istunto/${esc(sec.sessionKey)}`}
            {...NAV}
          >
            {esc(sec.sessionTitle)}
          </a>
          {sec.itemNumber && (
            <>
              &nbsp;›&nbsp; <span>Asiakohta {sec.itemNumber}</span>
            </>
          )}
        </div>

        <nav class="subnav" aria-label="Selaa istunnon asiakohtia">
          {data.prevSection ? (
            <a
              class="subnav__side prev"
              href={`/asiakohta/${esc(data.prevSection.key)}`}
              hx-get={`/asiakohta/${esc(data.prevSection.key)}`}
              {...NAV}
            >
              <span class="subnav__dir">
                ‹{" "}
                {data.prevSection.itemNumber
                  ? `Asiakohta ${data.prevSection.itemNumber}`
                  : "Edellinen"}
              </span>
              <span class="subnav__t">{esc(data.prevSection.title)}</span>
            </a>
          ) : (
            <a class="subnav__side prev" style="visibility:hidden"></a>
          )}
          <a
            class="subnav__mid"
            href={`/istunto/${esc(sec.sessionKey)}`}
            hx-get={`/istunto/${esc(sec.sessionKey)}`}
            {...NAV}
          >
            <span class="subnav__pos">
              {data.currentItemIndex} / {data.sessionItemsCount}
            </span>
            <span class="subnav__lbl">Päiväjärjestys</span>
          </a>
          {data.nextSection ? (
            <a
              class="subnav__side next"
              href={`/asiakohta/${esc(data.nextSection.key)}`}
              hx-get={`/asiakohta/${esc(data.nextSection.key)}`}
              {...NAV}
            >
              <span class="subnav__dir">
                {data.nextSection.itemNumber
                  ? `Asiakohta ${data.nextSection.itemNumber}`
                  : "Seuraava"}{" "}
                ›
              </span>
              <span class="subnav__t">{esc(data.nextSection.title)}</span>
            </a>
          ) : (
            <a class="subnav__side next" style="visibility:hidden"></a>
          )}
        </nav>

        <section class="doc-head">
          <div class="doc-head__top">
            <span class="doc-id">
              {sec.itemNumber ? `Asiakohta ${sec.itemNumber} · ` : ""}
              PTK {esc(sec.sessionKey)} vp
            </span>
            <span class="doc-type">
              Täysistunnon asiakohta
              {sec.processingTitle ? ` · ${esc(sec.processingTitle)}` : ""}
            </span>
            {sec.identifier && (
              <span class="tag tag--ghost" style="margin-left:auto">
                {esc(sec.identifier)}
              </span>
            )}
          </div>
          <h1>{esc(sec.title)}</h1>
          <div class="sess-meta">
            <span>
              <b>{sec.sessionDateLabel}</b>
            </span>
            <span class="sep"></span>
            {sec.timeRange && (
              <>
                <span>{sec.timeRange}</span>
                <span class="sep"></span>
              </>
            )}
            <span>{sec.phase}</span>
            <span class="sep"></span>
            <a
              href={`/istunto/${esc(sec.sessionKey)}`}
              style="color:var(--blue)"
              hx-get={`/istunto/${esc(sec.sessionKey)}`}
              {...NAV}
            >
              Avaa istunto ↗
            </a>
          </div>
        </section>

        <div class="doc-toolbar">
          <button type="button" class="tbtn">
            <span class="ic">↗</span> Pöytäkirja (PDF)
          </button>
          <a href="#vaiheet" class="tbtn">
            <span class="ic">▤</span> Käsittely
          </a>
          {data.votings.length > 0 && (
            <a href="#aanestykset" class="tbtn">
              <span class="ic">⚖</span> Äänestykset
            </a>
          )}
          {data.speeches.length > 0 && (
            <a href="#puheenvuorot" class="tbtn">
              <span class="ic">🗣</span> Puheenvuorot
            </a>
          )}
          <span class="grow"></span>
          <button type="button" class="tbtn">
            <span class="ic">⧉</span> Jaa
          </button>
        </div>

        <nav class="sess-jump">
          {data.lifecycleSteps.length > 0 && (
            <a href="#vaiheet">Käsittelyvaihe</a>
          )}
          {data.votings.length > 0 && (
            <a href="#aanestykset">Äänestykset · {data.votings.length}</a>
          )}
          {data.speeches.length > 0 && (
            <a href="#puheenvuorot">Puheenvuorot · {data.speeches.length}</a>
          )}
          {data.section.resolution && <a href="#paatos">Päätös</a>}
        </nav>

        {sec.note && (
          <div class="ai mt-24">
            <div class="ai__head">
              <span class="ai__spark">✦</span>
              <span class="ai__label">Tekoälykooste · mistä on kyse</span>
            </div>
            <p class="ai__body">{esc(sec.note)}</p>
            <div class="ai__foot">
              <span>
                Koneellisesti tuotettu kooste asiakohtaan liittyvistä
                käsittelytiedoista.
              </span>
            </div>
          </div>
        )}

        {data.lifecycleSteps.length > 0 && (
          <section id="vaiheet" class="mt-30 scroll-mt-14">
            <Kicker
              text="Käsittelyvaihe · eduskunnan käsittelytiedot"
              modifier="blue"
              dot
            />
            <div class="lifecycle">
              {data.lifecycleSteps.map((step) => (
                <div
                  class={clsx(
                    "lc-step",
                    step.isDone && "done",
                    step.isCurrent && "current",
                  )}
                >
                  <div class="lc-step__top">
                    <span class="lc-step__dot"></span>
                    <span class="lc-step__num">{step.stepNumber ?? ""}</span>
                  </div>
                  <div class="lc-step__label">{esc(step.label)}</div>
                  {step.date && <div class="lc-step__date">{step.date}</div>}
                  {step.tag && (
                    <div class={clsx("lc-step__tag", step.tagClass)}>
                      {esc(step.tag)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {(data.viewpoints.for.length > 0 ||
          data.viewpoints.against.length > 0) && (
          <section class="mt-24">
            <Kicker
              text="Kannanotot · puolesta ja vastaan"
              modifier="blue"
              dot
            />
            <div class="viewpoints">
              {data.viewpoints.for.length > 0 && (
                <div class="vp for">
                  <div class="vp__h">
                    <span class="vp__t">Puolesta</span>
                  </div>
                  <ul>
                    {data.viewpoints.for.map((pt) => (
                      <li>{esc(pt)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {data.viewpoints.against.length > 0 && (
                <div class="vp against">
                  <div class="vp__h">
                    <span class="vp__t">Vastaan</span>
                  </div>
                  <ul>
                    {data.viewpoints.against.map((pt) => (
                      <li>{esc(pt)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {data.votings.length > 0 && (
          <section id="aanestykset" class="mt-36 scroll-mt-14">
            <Kicker text="Äänestykset · miten asia eteni" modifier="blue" dot />
            <div class="ph__head">
              <h2>Äänestykset</h2>
              <span class="meta">{data.votings.length} äänestystä</span>
            </div>
            {data.votings.map((vo, i) => (
              <div class="vote-block" style={i === 0 ? "margin-top:4px" : ""}>
                <div class="vote-block__h">
                  <span class="vote-block__title">
                    <a
                      href={`/aanestys/${vo.id}`}
                      hx-get={`/aanestys/${vo.id}`}
                      {...NAV}
                      style="color:var(--blue);text-decoration:none"
                    >
                      {esc(vo.title)}
                    </a>
                  </span>
                </div>
                <div class="vote-block__result">
                  <span class="big">{vo.nYes}</span>
                  <span style="font-size:15px;color:var(--muted)">
                    JAA – EI
                  </span>
                  <span class="big">{vo.nNo}</span>
                  <span
                    class={clsx(
                      "spill",
                      vo.outcome === "ok" ? "spill--done" : "spill--draft",
                    )}
                  >
                    {vo.outcomeLabel}
                  </span>
                </div>
                <div class="vote-bar">
                  <span
                    class="v-jaa"
                    style={`width:${vo.yesPct.toFixed(1)}%`}
                  ></span>
                  <span
                    class="v-ei"
                    style={`width:${vo.noPct.toFixed(1)}%`}
                  ></span>
                </div>
                <div class="vote-legend mt-10">
                  <div class="vl">
                    <span class="sw" style="background:var(--hall)"></span>
                    <div>
                      <span class="vk">Jaa</span>
                      <span class="vv">{vo.nYes}</span>
                    </div>
                  </div>
                  <div class="vl">
                    <span class="sw" style="background:var(--red)"></span>
                    <div>
                      <span class="vk">Ei</span>
                      <span class="vv">{vo.nNo}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div class="decision mt-18">
              <div class="decision__icon">
                {data.votings[0]!.outcome === "ok" ? "✓" : "✗"}
              </div>
              <div class="decision__main">
                <div class="t">
                  {data.votings[0]!.outcomeLabel}, {data.votings[0]!.nYes}–
                  {data.votings[0]!.nNo}
                </div>
              </div>
            </div>
          </section>
        )}

        {data.speeches.length > 0 && (
          <section id="puheenvuorot" class="mt-36 scroll-mt-14">
            <Kicker text="Puheenvuorot · kuka sanoi mitä" modifier="blue" dot />
            <p style="font-size:14px;color:var(--muted);margin:6px 0 16px;max-width:66ch">
              Kaikki asiakohtaan liittyvät puheenvuorot kokonaisina,
              lyhentämättöminä. Kunkin edellä on{" "}
              <b style="color:var(--ink);font-weight:600">tekoälytiivistelmä</b>{" "}
              nopeaa silmäilyä varten.
            </p>
            <div class="fchips mt-6">
              <button class="fchip is-active" data-filter="all">
                Kaikki
              </button>
              <button class="fchip" data-filter="hallitus">
                <span class="pdot" style="background:var(--hall)"></span>
                Hallitus
              </button>
              <button class="fchip" data-filter="oppositio">
                <span class="pdot" style="background:var(--opp)"></span>
                Oppositio
              </button>
            </div>
            <div
              id="sp-empty"
              hidden
              style="text-align:center;color:var(--muted);padding:34px 0"
            >
              Ei puheenvuoroja näillä hakuehdoilla.
            </div>
            <div class="transcript">
              {data.speeches.map((sp) => (
                <article class="speech" data-bloc={sp.bloc}>
                  <div class="speech__av">
                    <span>{esc(sp.initials)}</span>
                    <span
                      class="pbar"
                      style={`background:${sp.partyColor}`}
                    ></span>
                  </div>
                  <div class="speech__main">
                    <div class="speech__head">
                      <span class="speech__name">
                        {esc(sp.firstName)} {esc(sp.lastName)}
                      </span>
                      <span class="tag">
                        <span
                          style={`width:9px;height:9px;border-radius:50%;background:${sp.partyColor};display:inline-block`}
                        ></span>{" "}
                        {esc(sp.partyName)}
                      </span>
                      <span class={clsx("speech__role", sp.roleClass)}>
                        {esc(sp.roleLabel)}
                      </span>
                      <span class="speech__time">
                        {sp.timeLabel}
                        {sp.durationLabel ? ` · ${sp.durationLabel}` : ""}
                      </span>
                    </div>
                    {sp.summary && (
                      <div class="speech__sum">
                        <span class="speech__sum-tag">
                          <span class="sp">✦</span>Tekoälytiivistelmä
                        </span>
                        <p>{esc(sp.summary)}</p>
                      </div>
                    )}
                    {sp.fullText && (
                      <div class="speech__body">
                        {sp.fullText.split("\n\n").map((para) => (
                          <p>{esc(para)}</p>
                        ))}
                      </div>
                    )}
                    <div class="speech__foot">
                      <span class="meta">
                        {sp.contentLength.toLocaleString("fi-FI")} merkkiä
                        {sp.durationLabel ? ` · ${sp.durationLabel}` : ""}
                        {" · "}suomi
                      </span>
                      <button type="button" class="link-arrow">
                        Avaa pöytäkirjassa (PTK) ↗
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {(data.section.resolution || data.votings.length > 0) && (
          <section class="ph mt-36 scroll-mt-14" id="paatos">
            <Kicker
              text="Päätös · miten asiakohta ratkesi"
              modifier="blue"
              dot
            />
            <div class="decision mt-8">
              <div class="decision__icon">
                {data.votings[0]?.outcome === "ok" ? "✓" : "✗"}
              </div>
              <div class="decision__main">
                <div class="t">
                  {esc(data.section.resolution ?? "Asiakohta käsitelty")}
                </div>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:18px">
              <a
                href={`/istunto/${esc(sec.sessionKey)}`}
                hx-get={`/istunto/${esc(sec.sessionKey)}`}
                {...NAV}
                class="link-arrow"
              >
                ← Takaisin istuntoon
              </a>
            </div>
          </section>
        )}

        {(data.prevSection || data.nextSection) && (
          <nav
            class="subnav subnav--foot"
            aria-label="Selaa istunnon asiakohtia"
          >
            {data.prevSection ? (
              <a
                class="subnav__side prev"
                href={`/asiakohta/${esc(data.prevSection.key)}`}
                hx-get={`/asiakohta/${esc(data.prevSection.key)}`}
                {...NAV}
              >
                <span class="subnav__dir">
                  ‹{" "}
                  {data.prevSection.itemNumber
                    ? `Asiakohta ${data.prevSection.itemNumber}`
                    : "Edellinen"}
                </span>
                <span class="subnav__t">{esc(data.prevSection.title)}</span>
              </a>
            ) : (
              <span></span>
            )}
            <a
              class="subnav__mid"
              href={`/istunto/${esc(sec.sessionKey)}`}
              hx-get={`/istunto/${esc(sec.sessionKey)}`}
              {...NAV}
            >
              <span class="subnav__pos">
                {data.currentItemIndex} / {data.sessionItemsCount}
              </span>
              <span class="subnav__lbl">Päiväjärjestys</span>
            </a>
            {data.nextSection ? (
              <a
                class="subnav__side next"
                href={`/asiakohta/${esc(data.nextSection.key)}`}
                hx-get={`/asiakohta/${esc(data.nextSection.key)}`}
                {...NAV}
              >
                <span class="subnav__dir">
                  {data.nextSection.itemNumber
                    ? `Asiakohta ${data.nextSection.itemNumber}`
                    : "Seuraava"}{" "}
                  ›
                </span>
                <span class="subnav__t">{esc(data.nextSection.title)}</span>
              </a>
            ) : (
              <span></span>
            )}
          </nav>
        )}

        <div class="source-note mt-32">
          <span>Lähde:</span>
          <span class="dset">
            Eduskunnan avoin data · Section + Speech + Voting
          </span>
          <span>·</span>
          <span class="fresh">haettu {data.fetchedAt}</span>
        </div>
      </div>
    </>
  );
}
