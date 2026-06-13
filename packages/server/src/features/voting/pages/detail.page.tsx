/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import Kicker from "#server/components/kicker";
import { esc } from "#server/helpers/template-helpers";
import { cite, sourceNote } from "#server/components/provenance";
import i18next from "i18next";
import type { SingleVoteData } from "./detail.view-model";

/** htmx link attributes used for SPA-like navigation within #main-content. */
const NAV = {
  "hx-target": "#main-content",
  "hx-push-url": "true",
  "hx-swap": "innerHTML",
} as const;

interface Props {
  title?: string;
  data: SingleVoteData;
}

export default function Aanestys({ title, data }: Props) {
  const v = data.vote;

  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: `${v.title || title} — Äänestys`,
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <div class="pt-16 text-muted" style="font-size:13px">
          <a
            href="/aanestykset"
            class="link-clr"
            hx-get="/aanestykset"
            {...NAV}
          >
            {i18next.t("votings:title")}
          </a>
          &nbsp;›&nbsp;{" "}
          <a
            href={`/istunto/${esc(v.sessionKey)}`}
            class="link-clr"
            hx-get={`/istunto/${esc(v.sessionKey)}`}
            {...NAV}
          >
            {i18next.t("votings:detail.breadcrumb_session", {
              key: esc(v.sessionKey),
            })}
          </a>
          &nbsp;›&nbsp;{" "}
          <span>
            {i18next.t("votings:detail.breadcrumb_voting", {
              number: v.votingNumber,
            })}
          </span>
        </div>

        <section class="doc-head">
          <div class="doc-head__top">
            <span class="doc-id">
              {cite(
                i18next.t("votings:detail.doc_id_format", {
                  number: v.votingNumber,
                  sessionKey: esc(v.sessionKey),
                }),
                data.provenance,
              )}
            </span>
            <span class="doc-type">
              {v.titleExtra ?? i18next.t("votings:detail.type_fallback")}
            </span>
            <span
              class={clsx(
                "tag",
                `tag--${v.outcome === "ok" ? "hall" : "opp"}`,
                "ml-auto",
              )}
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
                  class="link-clr"
                  hx-get={`/asiakohta/${esc(v.sectionKey)}`}
                  {...NAV}
                >
                  {i18next.t("votings:detail.section_link", {
                    num: v.asiakohtaNum,
                  })}
                </a>
              </>
            )}
            <span class="sep"></span>
            <a
              href={`/istunto/${esc(v.sessionKey)}`}
              class="link-clr"
              hx-get={`/istunto/${esc(v.sessionKey)}`}
              {...NAV}
            >
              {i18next.t("common:open_istunto")}
            </a>
          </div>
        </section>

        <div class="doc-toolbar">
          {v.sectionKey && (
            <a
              href={`/asiakohta/${esc(v.sectionKey)}`}
              class="tbtn"
              hx-get={`/asiakohta/${esc(v.sectionKey)}`}
              {...NAV}
            >
              <span class="ic">▤</span>
              {i18next.t("votings:detail.toolbar_section", {
                number: v.asiakohtaNum,
              })}
            </a>
          )}
          <a href="#ryhmat" class="tbtn">
            <span class="ic">▤</span>Ryhmittäin
          </a>
          <a href="#kartta" class="tbtn">
            <span class="ic">▦</span>Edustajakartta
          </a>
          <span class="grow"></span>
          <button type="button" class="tbtn">
            <span class="ic">⧉</span>
            {i18next.t("common:share")}
          </button>
        </div>

        <section class="vresult" id="vresult">
          <div class="vresult__q">
            {v.yesProposition && (
              <span class="prop">
                <span class="k j">{i18next.t("common:yes_uppercase")}</span>
                {esc(v.yesProposition)}
              </span>
            )}
            {v.noProposition && (
              <span class="prop">
                <span class="k e">{i18next.t("common:no_uppercase")}</span>
                {esc(v.noProposition)}
              </span>
            )}
          </div>
          <div class="vote-bar mt-16">
            <span class="v-jaa" style={`width:${v.yesPct.toFixed(1)}%`}>
              {i18next.t("common:yes_uppercase")} {v.nYes}
            </span>
            <span class="v-ei" style={`width:${v.noPct.toFixed(1)}%`}>
              {i18next.t("common:no_uppercase")} {v.nNo}
            </span>
            {v.nEmpty > 0 && (
              <span
                class="v-tyh"
                style={`width:${v.emptyPct.toFixed(1)}%`}
              ></span>
            )}
            <span class="v-poi" style={`width:${v.absentPct.toFixed(1)}%`}>
              {i18next.t("votings:detail.result_bar_absent", {
                count: v.nAbsent,
              })}
            </span>
          </div>
          <div class="vote-legend">
            <div class="vl">
              <span class="sw" style="background:var(--hall)"></span>
              <div>
                <span class="vk">{i18next.t("common:yes")}</span>
                <span class="vv">{v.nYes}</span>
              </div>
            </div>
            <div class="vl">
              <span class="sw" style="background:var(--red)"></span>
              <div>
                <span class="vk">{i18next.t("common:no")}</span>
                <span class="vv">{v.nNo}</span>
              </div>
            </div>
            {v.nEmpty > 0 && (
              <div class="vl">
                <span class="sw" style="background:var(--opp)"></span>
                <div>
                  <span class="vk">{i18next.t("common:empty")}</span>
                  <span class="vv">{v.nEmpty}</span>
                </div>
              </div>
            )}
            <div class="vl">
              <span class="sw" style="background:var(--paper-3)"></span>
              <div>
                <span class="vk">{i18next.t("common:absent")}</span>
                <span class="vv">{v.nAbsent}</span>
              </div>
            </div>
          </div>
          <div class="decision mt-18">
            <div class="decision__icon">{v.outcome === "ok" ? "✓" : "✗"}</div>
            <div class="decision__main">
              <div class="t">
                {v.outcomeLabel}, {v.nYes}–{v.nNo}
              </div>
              {data.govOppBreakdown.governmentTotal > 0 && (
                <div class="t sub">
                  {i18next.t("votings:detail.gov_label")}{" "}
                  {data.govOppBreakdown.governmentYes}–
                  {data.govOppBreakdown.governmentNo}
                  &nbsp;·&nbsp;
                  {i18next.t("votings:detail.opp_label")}{" "}
                  {data.govOppBreakdown.oppositionYes}–
                  {data.govOppBreakdown.oppositionNo}
                </div>
              )}
            </div>
          </div>
        </section>

        <div class="summary mt-24">
          <div class="summary__bar">
            <span class="l">
              <span class="spark">✦</span>
              <span class="lbl">{i18next.t("votings:detail.ai_summary")}</span>
            </span>
          </div>
          <div class="summary__in">
            <div class="summary__q">
              {i18next.t("votings:detail.ai_question")}
            </div>
            <p class="summary__lead">
              {i18next.t("votings:detail.ai_not_available")}
            </p>
            <div class="summary__foot">
              <span class="summary__disc">
                {i18next.t("votings:detail.ai_disclaimer")}
              </span>
            </div>
          </div>
        </div>

        <section id="ryhmat" class="ph mt-28" style="scroll-margin-top:14px">
          <Kicker
            text={i18next.t("votings:detail.section_groups_kicker")}
            modifier="blue"
            dot
          />
          <div class="ph__head">
            <h2>{i18next.t("votings:detail.section_groups_h2")}</h2>
            <span class="meta">
              {data.partyBreakdown.length} ryhmää · {v.nYes + v.nNo + v.nEmpty}{" "}
              annettua ääntä
            </span>
          </div>
          <p class="ph__intro">
            {i18next.t("votings:detail.section_groups_intro")}
          </p>
          <div class="vote-block" style="border:0;padding:0;margin-top:6px">
            {data.partyBreakdown.map((pb) => {
              const votesCast = pb.nYes + pb.nNo + pb.nEmpty;
              return (
                <div class="pvote">
                  <div class="pvote__name">
                    <span
                      class="d"
                      style={`background:${pb.partyColor}`}
                    ></span>
                    {esc(pb.partyName)}
                  </div>
                  <div class="pvote__bar">
                    <span
                      class="j"
                      style={`width:${votesCast > 0 ? ((pb.nYes / votesCast) * 100).toFixed(1) : 0}%`}
                    ></span>
                    <span
                      class="e"
                      style={`width:${votesCast > 0 ? ((pb.nNo / votesCast) * 100).toFixed(1) : 0}%`}
                    ></span>
                    {pb.nEmpty > 0 && (
                      <span
                        class="a"
                        style={`width:${votesCast > 0 ? ((pb.nEmpty / votesCast) * 100).toFixed(1) : 0}%`}
                      ></span>
                    )}
                  </div>
                  <div class="pvote__num">
                    {pb.nYes > 0 ? (
                      <>
                        <b>{pb.nYes}</b> jaa
                        {pb.nEmpty > 0 && <> · {pb.nEmpty} tyh</>}
                      </>
                    ) : pb.nNo > 0 ? (
                      <>
                        <b>{pb.nNo}</b> ei
                        {pb.nEmpty > 0 && <> · {pb.nEmpty} tyh</>}
                      </>
                    ) : (
                      <>
                        <b>{pb.nEmpty}</b> tyh
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div
          id="kartta"
          hx-get={`/aanestys/${data.vote.id}/kartta`}
          hx-trigger="load"
          style="min-height:300px;scroll-margin-top:14px"
        ></div>

        {data.relatedVotes.length > 0 && (
          <section class="mt-28">
            <Kicker
              text={i18next.t("votings:detail.related_votes_kicker")}
              modifier="blue"
              dot
            />
            <div class="ag-votes mt-4">
              {data.relatedVotes.map((rv) => {
                const rvTotal = rv.nYes + rv.nNo;
                return (
                  <a
                    href={`/aanestys/${rv.id}`}
                    hx-get={`/aanestys/${rv.id}`}
                    {...NAV}
                    class="agvote"
                  >
                    <div class="agvote__t">{esc(rv.title)}</div>
                    <div class="agvote__bar">
                      <span
                        class="j"
                        style={`width:${rvTotal > 0 ? ((rv.nYes / rvTotal) * 100).toFixed(1) : 0}%`}
                      ></span>
                      <span
                        class="e"
                        style={`width:${rvTotal > 0 ? ((rv.nNo / rvTotal) * 100).toFixed(1) : 0}%`}
                      ></span>
                    </div>
                    <div class="agvote__n">
                      <span class="j">{rv.nYes}</span>–
                      <span class="e">{rv.nNo}</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        <div class="mt-32">{sourceNote(data.sourceNote)}</div>
      </div>
    </>
  );
}
