/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";
import { cite, sourceNote } from "../components/provenance";
import { esc, partyShortName } from "../helpers";

export interface AsiakirjaViewModel {
  id: number;
  identifier: string;
  documentType: string;
  title: string;
  authorName: string;
  authorParty: string;
  authorPartyColor: string;
  authorPersonId: number | null;
  authorInitials: string;
  authorDistrict: string | null;
  submissionDate: string;
  statusLabel: string;
  statusColor: string;
  lifecycleStages: Array<{
    step: number;
    label: string;
    date: string | null;
    done: boolean;
    tag?: string;
  }>;
  questionParagraphs: string[];
  signatureText: string;
  hasAnswer: boolean;
  answerIdentifier: string | null;
  answerDate: string | null;
  answerMinisterTitle: string | null;
  answerMinisterName: string | null;
  answerText: string | null;
  subjects: string[];
  charCount: number;
  fetchedAt: string;
}

interface Props {
  data: AsiakirjaViewModel;
}

function formatFi(iso: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

export default function Asiakirja({ data }: Props) {
  const d = data;
  const title = `${d.identifier} — ${d.title}`;
  return (
    <>
      <title>{title} — Eduskuntapeili</title>

      <div class="wrap">
        <div style="padding-top:16px;font-size:13px;color:var(--muted)">
          <a href="/asiakirjat" style="color:var(--blue)">
            Asiakirjat
          </a>
          &nbsp;›&nbsp; <span>{d.identifier}</span>
        </div>

        <section class="doc-head">
          <div class="doc-head__top">
            <span class="doc-id">{d.identifier}</span>
            <span class="doc-type">{d.documentType}</span>
          </div>
          <h1>{esc(d.title)}</h1>
          <div class="doc-byline">
            <span
              class="pdot"
              style={`background:${d.authorPartyColor}`}
            ></span>
            {d.authorPersonId ? (
              <a
                href={`/edustaja/${d.authorPersonId}`}
                class="who"
                style="color:var(--ink)"
              >
                {esc(d.authorName)}
              </a>
            ) : (
              <span class="who">{esc(d.authorName)}</span>
            )}
            <span>({d.authorParty})</span>
            <span class="sep"></span>
            <span>Jätetty {d.submissionDate}</span>
            {d.hasAnswer && d.answerMinisterTitle && (
              <>
                <span class="sep"></span>
                <span>Vastattavana: {d.answerMinisterTitle}</span>
              </>
            )}
          </div>
        </section>

        <div class="doc-toolbar">
          <button class="tbtn">
            <span class="ic">↗</span> Alkuperäinen (PDF)
          </button>
          <button class="tbtn">
            <span class="ic">⧉</span> Jaa
          </button>
        </div>

        {d.lifecycleStages.length > 0 && (
          <>
            <Kicker
              text="Asian kulku — kysymys ja vastaus yhdessä näkymässä"
              modifier=""
            />
            <nav class="lifecycle" style="margin-top:8px">
              {d.lifecycleStages.map((stage) => (
                <div class={`lc-step${stage.done ? " done" : ""}`}>
                  <div class="lc-step__top">
                    <span class="lc-step__dot"></span>
                    <span class="lc-step__num">
                      {String(stage.step).padStart(2, "0")}
                    </span>
                  </div>
                  <div class="lc-step__label">{esc(stage.label)}</div>
                  {stage.date && (
                    <div class="lc-step__date">{formatFi(stage.date)}</div>
                  )}
                  {stage.tag && (
                    <div
                      class={`lc-step__tag ${stage.tag === "vastattu" ? "ok" : ""}`}
                    >
                      {stage.tag}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </>
        )}

        <div class="summary">
          <div class="summary__bar">
            <span class="l">
              <span class="spark">✦</span>
              <span class="lbl">Asiakirjan sisältö</span>
            </span>
            <span class="read">{d.charCount.toLocaleString("fi")} merkkiä</span>
          </div>
          <div class="summary__in">
            <div class="summary__q">Mistä tässä on kyse?</div>
            {d.questionParagraphs.length > 0 && (
              <p class="summary__lead">
                {esc(d.questionParagraphs[0]!.slice(0, 280))}…
              </p>
            )}
          </div>
        </div>
      </div>

      <div class="doc-body wrap">
        <article class="article" id="kysymys">
          {d.lifecycleStages.length > 0 &&
            d.lifecycleStages.find((s) => s.step === 1) && (
              <div class="article__phase">
                Vaihe{" "}
                {String(
                  d.lifecycleStages.find((s) => s.step === 1)!.step,
                ).padStart(2, "0")}{" "}
                · {d.documentType} — alkuperäinen teksti
              </div>
            )}

          {d.questionParagraphs.map((para, i) =>
            i === 0 ? (
              <p class="standfirst">{esc(para)}</p>
            ) : (
              <p>{esc(para)}</p>
            ),
          )}

          <div class="article__sig">
            <div class="name">
              {esc(d.authorName)} /{d.authorParty}
            </div>
            <div class="meta">{esc(d.signatureText)}</div>
          </div>

          {sourceNote({
            dataset: "Eduskunnan avoin data · VaskiData",
            fetchedAt: d.fetchedAt,
            extra: cite("varmenna teksti", {
              value: d.identifier,
              caption: `${d.documentType}n koko teksti`,
              set: "Eduskunnan avoin data · VaskiData",
              table: "WrittenQuestion.question_text",
              endpoint: `GET /api/v1/tables/VaskiData?eduskuntaTunnus=${encodeURIComponent(d.identifier)}`,
              record: `WrittenQuestion.id · ${d.charCount.toLocaleString("fi")} merkkiä`,
              fetched: d.fetchedAt,
              chain:
                "avoindata.eduskunta.fi > WrittenQuestion > Asiakirjanäkymä",
              url: "https://avoindata.eduskunta.fi/",
              orig: "Avaa alkuperäinen",
              mark: "off",
            }),
          })}

          {d.hasAnswer && (
            <div
              id="vastaus"
              style="margin-top:40px;padding-top:4px;border-top:2px solid var(--ink)"
            >
              <div class="article__phase" style="margin-top:20px">
                Vaihe{" "}
                {String(
                  d.lifecycleStages.find((s) => s.tag === "vastattu")?.step ??
                    3,
                ).padStart(2, "0")}{" "}
                · Vastaus — {d.answerMinisterTitle} ·{" "}
                {d.answerDate ? formatFi(d.answerDate) : ""}
              </div>
              <h3 style="margin-top:0">Ministerin vastaus</h3>

              <div class="summary" style="margin:14px 0 22px">
                <div class="summary__bar">
                  <span class="l">
                    <span class="spark">✦</span>
                    <span class="lbl">Vastauksen tiedot</span>
                  </span>
                </div>
                <div class="summary__in">
                  <div class="summary__q">Mitä ministeri vastasi?</div>
                  <p class="summary__lead">
                    {d.answerText
                      ? esc(d.answerText)
                      : `Ministeri ${d.answerMinisterName ?? ""} antoi vastauksen ${d.answerDate ? formatFi(d.answerDate) : ""}.`}
                  </p>
                  <ul class="summary__points">
                    <li>
                      Vastauksen tunnus: <b>{esc(d.answerIdentifier ?? "")}</b>
                    </li>
                    <li>
                      Vastaaja: <b>{esc(d.answerMinisterName ?? "")}</b> ·{" "}
                      {esc(d.answerMinisterTitle ?? "")}
                    </li>
                    <li>
                      Vastaus annettu:{" "}
                      <b>{d.answerDate ? formatFi(d.answerDate) : ""}</b>
                    </li>
                  </ul>
                </div>
              </div>

              <div style="margin-top:14px">
                <a
                  href={`https://avoindata.eduskunta.fi/`}
                  class="tbtn"
                  target="_blank"
                  rel="noopener"
                >
                  <span class="ic">↗</span> Alkuperäinen vastaus
                </a>
              </div>

              <div class="article__sig">
                <div class="name">
                  {esc(d.answerMinisterTitle ?? "Ministeri")}
                </div>
                <div class="meta">
                  Vastaus annettu {d.answerDate ? formatFi(d.answerDate) : ""} ·{" "}
                  {esc(d.answerIdentifier ?? "")}
                </div>
              </div>

              {sourceNote({
                dataset:
                  "Eduskunnan avoin data · VaskiData (ministerin vastaus)",
                fetchedAt: d.fetchedAt,
                extra: cite("varmenna vastaus", {
                  value: `Vastaus ${d.identifier}`,
                  caption: "Ministerin kirjallinen vastaus",
                  set: "Eduskunnan avoin data · VaskiData",
                  table: "WrittenQuestion (answer fields)",
                  endpoint: `GET /api/v1/tables/VaskiData?eduskuntaTunnus=${encodeURIComponent(d.answerIdentifier ?? d.identifier)}`,
                  record: `answer_date = ${d.answerDate ?? ""}${d.answerMinisterTitle ? ` · vastaaja ${d.answerMinisterTitle}` : ""}`,
                  fetched: d.fetchedAt,
                  chain: "avoindata.eduskunta.fi > WrittenQuestion > Vastaus",
                  url: "https://avoindata.eduskunta.fi/",
                  orig: "Avaa vastaus",
                  mark: "off",
                }),
              })}
            </div>
          )}
        </article>

        <aside class="doc-aside">
          <div class="blk">
            <h4>Käsittelyn vaihe</h4>
            <div class="statusline">
              <span
                class="statusdot"
                style={`background:${d.statusColor}`}
              ></span>
              {esc(d.statusLabel)}
            </div>
            {d.lifecycleStages.length > 0 && (
              <ul class="timeline" style="margin-top:14px">
                {d.lifecycleStages.map((stage) => (
                  <li class={stage.done ? "done" : ""}>
                    <div class="tl-when">
                      {stage.date ? formatFi(stage.date) : "—"}
                    </div>
                    <div class="tl-what">{esc(stage.label)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div class="blk">
            <h4>Tiedot</h4>
            <dl>
              <dt>Tunnus</dt>
              <dd>{esc(d.identifier)}</dd>
              <dt>Tyyppi</dt>
              <dd>{esc(d.documentType)}</dd>
              <dt>Jätetty</dt>
              <dd>{d.submissionDate}</dd>
              {d.hasAnswer && d.answerDate && (
                <>
                  <dt>Vastattu</dt>
                  <dd>{formatFi(d.answerDate)}</dd>
                </>
              )}
              {d.answerMinisterTitle && (
                <>
                  <dt>Vastaaja</dt>
                  <dd>{esc(d.answerMinisterTitle)}</dd>
                </>
              )}
              <dt>Pituus</dt>
              <dd>{d.charCount.toLocaleString("fi")} merkkiä</dd>
            </dl>
          </div>

          <div class="blk">
            <h4>Tekijä</h4>
            <a
              href={d.authorPersonId ? `/edustaja/${d.authorPersonId}` : "#"}
              class="related-row"
              style="display:flex;align-items:center;gap:11px;border:0;padding:0"
            >
              <span style="width:40px;height:40px;background:var(--paper-2);border:1px solid var(--rule);display:flex;align-items:center;justify-content:center;font:800 15px var(--head);color:var(--faint);position:relative;overflow:hidden">
                {d.authorInitials}
                <span
                  style={`position:absolute;left:0;bottom:0;height:4px;width:100%;background:${d.authorPartyColor}`}
                ></span>
              </span>
              <span>
                <span style="display:block;font:700 14px var(--head);color:var(--ink)">
                  {esc(d.authorName)}
                </span>
                <span style="font-size:12px;color:var(--muted)">
                  {partyShortName(d.authorParty, d.authorParty)}
                  {d.authorDistrict ? ` · ${esc(d.authorDistrict)}` : ""}
                </span>
              </span>
            </a>
          </div>

          {d.subjects.length > 0 && (
            <div class="blk">
              <h4>Aiheet</h4>
              <div class="topics">
                {d.subjects.map((s) => (
                  <span
                    class="topic-tag"
                    style="font-size:13px;padding:6px 10px"
                  >
                    {esc(s)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
