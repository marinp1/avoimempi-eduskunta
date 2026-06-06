/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";
import { cite, sourceNote } from "../components/provenance";
import { esc, partyShortName } from "../helpers";

export interface TextSection {
  heading: string;
  paragraphs: string[];
  html: string | null;
}

export interface Signatory {
  name: string;
  role: string | null;
  party: string | null;
  partyColor: string | null;
  personId: number | null;
}

export interface Law {
  order: number;
  type: string | null;
  name: string | null;
}

export interface AsiakirjaViewModel {
  kind: string;
  id: number;
  identifier: string;
  documentTypeLabel: string;
  title: string;

  authorName: string;
  authorRole: string | null;
  authorParty: string | null;
  authorPartyColor: string;
  authorPersonId: number | null;
  authorInitials: string;
  authorDistrict: string | null;

  primaryDate: string;
  primaryDateLabel: string;
  secondaryDate: string | null;
  secondaryDateLabel: string | null;

  statusLabel: string;
  statusColor: string;

  textSections: TextSection[];

  lifecycleStages: Array<{
    step: number;
    label: string;
    date: string | null;
    done: boolean;
    tag?: string;
  }>;

  hasAnswer: boolean;
  answerIdentifier: string | null;
  answerDate: string | null;
  answerMinisterTitle: string | null;
  answerMinisterName: string | null;

  signatories: Signatory[];
  laws: Law[];
  sourceReference: string | null;

  subjects: string[];
  charCount: number;
  sessions: Array<{
    sessionKey: string;
    sessionDate: string;
    sessionNumber: number;
    sessionYear: string;
    sectionTitle: string | null;
  }>;
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
            <span class="doc-type">{d.documentTypeLabel}</span>
          </div>
          <h1>{esc(d.title)}</h1>
          <div class="doc-byline">
            {d.authorPartyColor && (
              <span
                class="pdot"
                style={`background:${d.authorPartyColor}`}
              ></span>
            )}
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
            {d.authorRole && (
              <span style="font-size:12px;color:var(--muted)">
                {esc(d.authorRole)}
              </span>
            )}
            {d.authorParty && <span>({d.authorParty})</span>}
            <span class="sep"></span>
            <span>
              {d.primaryDateLabel} {d.primaryDate}
            </span>
            {d.secondaryDate && (
              <>
                <span class="sep"></span>
                <span>
                  {d.secondaryDateLabel} {d.secondaryDate}
                </span>
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
            <Kicker text="Asian kulku" modifier="" />
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

        {d.textSections.length > 0 &&
          (d.textSections[0]!.paragraphs.length > 0 ||
            d.textSections[0]!.html) && (
            <div class="summary">
              <div class="summary__bar">
                <span class="l">
                  <span class="spark">✦</span>
                  <span class="lbl">Asiakirjan sisältö</span>
                </span>
                <span class="read">
                  {d.charCount.toLocaleString("fi")} merkkiä
                </span>
              </div>
              <div class="summary__in">
                <div class="summary__q">Mistä tässä on kyse?</div>
                <p class="summary__lead">
                  {d.textSections[0]!.paragraphs[0]
                    ? esc(d.textSections[0]!.paragraphs[0]!.slice(0, 280)) + "…"
                    : d.textSections[0]!.html
                      ? d.textSections[0]!.html.replace(/<[^>]+>/g, "").slice(
                          0,
                          280,
                        ) + "…"
                      : ""}
                </p>
              </div>
            </div>
          )}
      </div>

      <div class="doc-body wrap">
        <article class="article" id="kysymys">
          {d.textSections.map((section, si) => (
            <>
              <div class="article__phase">{section.heading}</div>
              {section.html
                ? section.html
                : section.paragraphs.map((para, pi) =>
                    pi === 0 && si === 0 ? (
                      <p class="standfirst">{esc(para)}</p>
                    ) : (
                      <p>{esc(para)}</p>
                    ),
                  )}
            </>
          ))}

          {(d.signatories.length > 0 || d.laws.length > 0) && (
            <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--rule)">
              {d.signatories.length > 0 && (
                <div style="margin-bottom:20px">
                  <h3>Allekirjoittajat</h3>
                  <div class="signatory-list">
                    {d.signatories.map((sig) => (
                      <div class="signatory-row">
                        {sig.partyColor && (
                          <span
                            class="pdot"
                            style={`background:${sig.partyColor}`}
                          ></span>
                        )}
                        <span class="signatory-name">
                          {sig.personId ? (
                            <a href={`/edustaja/${sig.personId}`}>
                              {esc(sig.name)}
                            </a>
                          ) : (
                            esc(sig.name)
                          )}
                        </span>
                        {sig.role && (
                          <span class="signatory-role">{esc(sig.role)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {d.laws.length > 0 && (
                <div>
                  <h3>Lait</h3>
                  <ul class="law-list">
                    {d.laws.map((law) => (
                      <li>
                        {law.type && (
                          <span class="law-type">{esc(law.type)}</span>
                        )}
                        <span>{esc(law.name ?? "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div class="article__sig">
            <div class="name">{esc(d.authorName)}</div>
            <div class="meta">
              {[
                d.authorRole,
                d.primaryDate ? `${d.primaryDateLabel} ${d.primaryDate}` : "",
                d.authorDistrict ?? "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>

          {sourceNote({
            dataset: "Eduskunnan avoin data · VaskiData",
            fetchedAt: d.fetchedAt,
            extra: cite("varmenna teksti", {
              value: d.identifier,
              caption: `${d.documentTypeLabel}n koko teksti`,
              set: "Eduskunnan avoin data · VaskiData",
              table: "VaskiData",
              endpoint: `GET /api/v1/tables/VaskiData?eduskuntaTunnus=${encodeURIComponent(d.identifier)}`,
              record: `${d.documentTypeLabel} · ${d.charCount.toLocaleString("fi")} merkkiä`,
              fetched: d.fetchedAt,
              chain: "avoindata.eduskunta.fi > VaskiData > Asiakirjanäkymä",
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
                Vastaus — {d.answerMinisterTitle} ·{" "}
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
                    Ministeri {d.answerMinisterName ?? ""} antoi vastauksen{" "}
                    {d.answerDate ? formatFi(d.answerDate) : ""}.
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
              <dd>{esc(d.documentTypeLabel)}</dd>
              <dt>{d.primaryDateLabel}</dt>
              <dd>{d.primaryDate}</dd>
              {d.secondaryDate && (
                <>
                  <dt>{d.secondaryDateLabel}</dt>
                  <dd>{d.secondaryDate}</dd>
                </>
              )}
              {d.sourceReference && (
                <>
                  <dt>Viite</dt>
                  <dd>{esc(d.sourceReference)}</dd>
                </>
              )}
              <dt>Pituus</dt>
              <dd>{d.charCount.toLocaleString("fi")} merkkiä</dd>
            </dl>
          </div>

          <div class="blk">
            <h4>
              {d.kind === "he"
                ? "Esittelijä"
                : d.kind === "mietinto"
                  ? "Valiokunta"
                  : d.kind === "vastaus"
                    ? "Vastaaja"
                    : "Tekijä"}
            </h4>
            <a
              href={d.authorPersonId ? `/edustaja/${d.authorPersonId}` : "#"}
              class="related-row"
              style="display:flex;align-items:center;gap:11px;border:0;padding:0"
            >
              <span style="width:40px;height:40px;background:var(--paper-2);border:1px solid var(--rule);display:flex;align-items:center;justify-content:center;font:800 15px var(--head);color:var(--faint);position:relative;overflow:hidden">
                {d.authorInitials}
                {d.kind === "kk" ||
                d.kind === "valikysymys" ||
                d.kind === "aloite" ||
                d.kind === "suullinen" ? (
                  <span
                    style={`position:absolute;left:0;bottom:0;height:4px;width:100%;background:${d.authorPartyColor}`}
                  ></span>
                ) : null}
              </span>
              <span>
                <span style="display:block;font:700 14px var(--head);color:var(--ink)">
                  {esc(d.authorName)}
                </span>
                <span style="font-size:12px;color:var(--muted)">
                  {d.authorParty
                    ? partyShortName(d.authorParty, d.authorParty)
                    : (d.authorRole ?? "")}
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

          {d.sessions.length > 0 && (
            <div class="blk">
              <h4>Liittyvät istunnot</h4>
              {d.sessions.map((s) => (
                <a
                  class="related-row"
                  href={`/istunto/${s.sessionYear}/${s.sessionNumber}`}
                >
                  <span class="rid">{s.sessionKey}</span>
                  <span class="rt">
                    {s.sectionTitle ?? `Istunto ${s.sessionKey}`}
                  </span>
                </a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
