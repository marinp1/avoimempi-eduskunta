/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import i18next from "i18next";
import Kicker from "#server/components/kicker";
import { cite, sourceNote } from "#server/components/provenance";
import {
  esc,
  partyShortName,
  formatFi as formatFiBase,
} from "#server/helpers/template-helpers";
import type { DocumentKind } from "../kinds/types";

const NAV = {
  "hx-target": "#main-content",
  "hx-push-url": "true",
  "hx-swap": "innerHTML",
} as const;

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
  kind: DocumentKind;
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
  return iso ? formatFiBase(iso) : "";
}

export default function Asiakirja({ data }: Props) {
  const d = data;
  const title = `${d.identifier} — ${d.title}`;
  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: title || "",
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <div style="padding-top:16px;font-size:13px;color:var(--muted)">
          <a
            href="/asiakirjat"
            hx-get="/asiakirjat"
            {...NAV}
            style="color:var(--blue)"
          >
            {i18next.t("documents:detail.breadcrumb")}
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
                hx-get={`/edustaja/${d.authorPersonId}`}
                {...NAV}
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
            <span class="ic">↗</span> {i18next.t("common:original_pdf")}
          </button>
          <button class="tbtn">
            <span class="ic">⧉</span> {i18next.t("common:share")}
          </button>
        </div>

        {d.lifecycleStages.length > 0 && (
          <>
            <Kicker
              text={i18next.t("documents:detail.lifecycle_kicker")}
              modifier=""
            />
            <nav class="lifecycle mt-8">
              {d.lifecycleStages.map((stage) => (
                <div class={clsx("lc-step", { done: stage.done })}>
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
                      class={clsx("lc-step__tag", {
                        ok: stage.tag === "vastattu",
                      })}
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
                  <span class="lbl">
                    {i18next.t("documents:detail.content_label")}
                  </span>
                </span>
                <span class="read">
                  {d.charCount.toLocaleString("fi")}{" "}
                  {i18next.t("common:characters")}
                </span>
              </div>
              <div class="summary__in">
                <div class="summary__q">
                  {i18next.t("documents:detail.content_question")}
                </div>
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
            <div class="mt-28 pt-20 bt-rule">
              {d.signatories.length > 0 && (
                <div style="margin-bottom:20px">
                  <h3>{i18next.t("documents:detail.signatories")}</h3>
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
                            <a
                              href={`/edustaja/${sig.personId}`}
                              hx-get={`/edustaja/${sig.personId}`}
                              {...NAV}
                            >
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
                  <h3>{i18next.t("documents:detail.laws")}</h3>
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
            extra: cite(i18next.t("common:verify_text"), {
              value: d.identifier,
              caption: `${d.documentTypeLabel}n koko teksti`,
              set: "Eduskunnan avoin data · VaskiData",
              table: "VaskiData",
              endpoint: `GET /api/v1/tables/VaskiData?eduskuntaTunnus=${encodeURIComponent(d.identifier)}`,
              record: `${d.documentTypeLabel} · ${d.charCount.toLocaleString("fi")} merkkiä`,
              fetched: d.fetchedAt,
              chain: "avoindata.eduskunta.fi > VaskiData > Asiakirjanäkymä",
              url: "https://avoindata.eduskunta.fi/",
              orig: i18next.t("common:open_source"),
              mark: "off",
            }),
          })}

          {d.hasAnswer && (
            <div id="vastaus" class="mt-40 pt-4 bt-ink">
              <div class="article__phase mt-20">
                {i18next.t("documents:detail.answer_section_title", {
                  ministerTitle: d.answerMinisterTitle,
                  date: d.answerDate ? formatFi(d.answerDate) : "",
                })}
              </div>
              <h3>{i18next.t("documents:detail.answer_heading")}</h3>

              <div class="summary" style="margin:14px 0 22px">
                <div class="summary__bar">
                  <span class="l">
                    <span class="spark">✦</span>
                    <span class="lbl">
                      {i18next.t("documents:detail.answer_info_label")}
                    </span>
                  </span>
                </div>
                <div class="summary__in">
                  <div class="summary__q">
                    {i18next.t("documents:detail.answer_question")}
                  </div>
                  <p class="summary__lead">
                    {i18next.t("documents:detail.answer_minister_gave", {
                      name: d.answerMinisterName ?? "",
                      date: d.answerDate ? formatFi(d.answerDate) : "",
                    })}
                  </p>
                  <ul class="summary__points">
                    <li>
                      {i18next.t("documents:detail.answer_id_label")}{" "}
                      <b>{esc(d.answerIdentifier ?? "")}</b>
                    </li>
                    <li>
                      {i18next.t("documents:detail.answer_respondent_label")}{" "}
                      <b>{esc(d.answerMinisterName ?? "")}</b> ·{" "}
                      {esc(d.answerMinisterTitle ?? "")}
                    </li>
                    <li>
                      {i18next.t("documents:detail.answer_given_label")}{" "}
                      <b>{d.answerDate ? formatFi(d.answerDate) : ""}</b>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="mt-14">
                <a
                  href={`https://avoindata.eduskunta.fi/`}
                  class="tbtn"
                  target="_blank"
                  rel="noopener"
                >
                  <span class="ic">↗</span>{" "}
                  {i18next.t("documents:detail.answer_original_link")}
                </a>
              </div>

              <div class="article__sig">
                <div class="name">
                  {esc(
                    d.answerMinisterTitle ??
                      i18next.t("documents:detail.answer_signature_title"),
                  )}
                </div>
                <div class="meta">
                  {i18next.t("documents:detail.answer_signature_meta", {
                    date: d.answerDate ? formatFi(d.answerDate) : "",
                    id: esc(d.answerIdentifier ?? ""),
                  })}
                </div>
              </div>

              {sourceNote({
                dataset:
                  "Eduskunnan avoin data · VaskiData (ministerin vastaus)",
                fetchedAt: d.fetchedAt,
                extra: cite(i18next.t("common:verify_answer"), {
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
            <h4>{i18next.t("documents:detail.statusline_phase")}</h4>
            <div class="statusline">
              <span
                class="statusdot"
                style={`background:${d.statusColor}`}
              ></span>
              {esc(d.statusLabel)}
            </div>
            {d.lifecycleStages.length > 0 && (
              <ul class="timeline mt-14">
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
            <h4>{i18next.t("documents:detail.details_block")}</h4>
            <dl>
              <dt>{i18next.t("documents:detail.details_identifier")}</dt>
              <dd>{esc(d.identifier)}</dd>
              <dt>{i18next.t("documents:detail.details_type")}</dt>
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
                  <dt>{i18next.t("documents:detail.details_ref")}</dt>
                  <dd>{esc(d.sourceReference)}</dd>
                </>
              )}
              <dt>{i18next.t("documents:detail.details_length")}</dt>
              <dd>{d.charCount.toLocaleString("fi")} merkkiä</dd>
            </dl>
          </div>

          <div class="blk">
            <h4>
              {d.kind === "he"
                ? i18next.t("documents:detail.author_presenter")
                : d.kind === "mietinto"
                  ? i18next.t("documents:detail.author_committee")
                  : d.kind === "vastaus"
                    ? i18next.t("documents:detail.author_respondent")
                    : i18next.t("documents:detail.author_creator")}
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
              <h4>{i18next.t("documents:detail.subjects")}</h4>
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
              <h4>{i18next.t("documents:detail.related_sessions")}</h4>
              {d.sessions.map((s) => (
                <a
                  class="related-row"
                  href={`/istunto/${s.sessionYear}/${s.sessionNumber}`}
                  hx-get={`/istunto/${s.sessionYear}/${s.sessionNumber}`}
                  {...NAV}
                >
                  <span class="rid">{s.sessionKey}</span>
                  <span class="rt">
                    {s.sectionTitle ??
                      i18next.t("documents:detail.session_label", {
                        key: s.sessionKey,
                      })}
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
