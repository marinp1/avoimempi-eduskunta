/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import Kicker from "../components/kicker";
import { esc } from "../helpers";
import type { AsiakohtaData } from "./asiakohta-view-model";

export default function Asiakohta({
  _title,
  data,
}: {
  _title?: string;
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
          <a href="/istunnot" style="color:var(--blue)">
            Istunnot
          </a>
          &nbsp;›&nbsp;{" "}
          <a href={`/istunto/${esc(sec.sessionKey)}`} style="color:var(--blue)">
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
              hx-target="#main-content"
              hx-push-url="true"
              hx-swap="innerHTML"
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
          <a class="subnav__mid" href={`/istunto/${esc(sec.sessionKey)}`}>
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
              hx-target="#main-content"
              hx-push-url="true"
              hx-swap="innerHTML"
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
            >
              Avaa istunto ↗
            </a>
          </div>
        </section>

        <div class="doc-toolbar">
          <a href="#" class="tbtn">
            <span class="ic">↗</span> Pöytäkirja (PDF)
          </a>
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
          <button class="tbtn">
            <span class="ic">⧉</span> Jaa
          </button>
        </div>

        {sec.note && (
          <div class="ai" style="margin-top:24px">
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
          <section id="vaiheet" style="margin-top:30px;scroll-margin-top:14px">
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
                    <span class="lc-step__num">{step.date ?? ""}</span>
                  </div>
                  <div class="lc-step__label">{esc(step.label)}</div>
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
          <section style="margin-top:24px">
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
          <section
            id="aanestykset"
            style="margin-top:36px;scroll-margin-top:14px"
          >
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
                      hx-target="#main-content"
                      hx-push-url="true"
                      hx-swap="innerHTML"
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
                <div class="vote-legend" style="margin-top:10px">
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
            <div class="decision" style="margin-top:18px">
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
          <section
            id="puheenvuorot"
            style="margin-top:36px;scroll-margin-top:14px"
          >
            <Kicker text="Puheenvuorot · kuka sanoi mitä" modifier="blue" dot />
            <p style="font-size:14px;color:var(--muted);margin:6px 0 16px;max-width:66ch">
              Kaikki asiakohtaan liittyvät puheenvuorot kokonaisina,
              lyhentämättöminä. Kunkin edellä on{" "}
              <b style="color:var(--ink);font-weight:600">tekoälytiivistelmä</b>{" "}
              nopeaa silmäilyä varten.
            </p>
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
                      <a href="#" class="link-arrow">
                        Avaa pöytäkirjassa ↗
                      </a>
                    </div>
                  </div>
                </article>
              ))}
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
                hx-target="#main-content"
                hx-push-url="true"
                hx-swap="innerHTML"
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
            <a class="subnav__mid" href={`/istunto/${esc(sec.sessionKey)}`}>
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
                hx-target="#main-content"
                hx-push-url="true"
                hx-swap="innerHTML"
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

        <div class="source-note" style="margin-top:32px">
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
