/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import Kicker from "../components/kicker";
import Tag from "../components/tag";
import { esc } from "../helpers";
import type { PartyDetailData } from "./puolue-view-model";
import i18next from "i18next";

const NAV = {
  "hx-target": "#main-content",
  "hx-push-url": "true",
  "hx-swap": "innerHTML",
} as const;

interface Props {
  title?: string;
  data: PartyDetailData;
}

export default function Puolue({ title, data }: Props) {
  const p = data.party;
  const coh = data.cohesion;

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
            href="/puolueet"
            style="color:var(--blue)"
            hx-get="/puolueet"
            {...NAV}
          >
            {i18next.t("puolueet:detail.breadcrumb")}
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
                text={
                  p.bloc === "government"
                    ? i18next.t("common:government")
                    : i18next.t("common:opposition")
                }
                modifier={p.bloc === "government" ? "hall" : "opp"}
              />
            </div>
            <h1 class="bio-name">{esc(p.name)}</h1>
            <div class="bio-meta">
              <span>
                {esc(p.name)} {i18next.t("puolueet:detail.mp_group_suffix")}
              </span>
              <span class="sep"></span>
              {p.chairName && (
                <>
                  <span>
                    {i18next.t("puolueet:chair_prefix")}{" "}
                    <b style="color:var(--ink)">{esc(p.chairName)}</b>
                  </span>
                  <span class="sep"></span>
                </>
              )}
              <span>
                {i18next.t("puolueet:seat_ratio_format", {
                  own: p.seatCount,
                  total: data.totalSeats,
                })}
              </span>
              <span class="sep"></span>
              {p.govtSince && (
                <span>
                  {i18next.t("puolueet:detail.in_government_since", {
                    year: esc(p.govtSince),
                  })}
                </span>
              )}
            </div>
          </div>
        </section>

        <div class="bio-stats">
          <div class="bio-stat">
            <div class="k">{i18next.t("puolueet:detail.stat_seats")}</div>
            <div class="v">
              {p.seatCount} <small>{p.seatShare}</small>
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">{i18next.t("puolueet:detail.stat_cohesion")}</div>
            <div class="v">
              {coh.pct != null ? coh.pct : "–"}
              {coh.pct != null ? <small>%</small> : null}
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">{i18next.t("puolueet:detail.stat_attendance")}</div>
            <div class="v">
              {p.avgAttendance ?? "–"}
              {p.avgAttendance ? <small>%</small> : null}
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">{i18next.t("puolueet:detail.stat_avg_age")}</div>
            <div class="v">
              {p.avgAge ?? "–"}
              {p.avgAge ? <small>v</small> : null}
            </div>
          </div>
        </div>

        <div class="bio-grid">
          <div>
            <div class="ai">
              <div class="ai__head">
                <span class="ai__spark">✦</span>
                <span class="ai__label">
                  {i18next.t("puolueet:detail.ai_summary_label")}
                </span>
              </div>
              <p class="ai__body">
                {i18next.t("puolueet:detail.ai_not_available")}
              </p>
              <div class="ai__foot">
                <span>{i18next.t("puolueet:detail.ai_disclaimer")}</span>
              </div>
            </div>

            {coh.pct != null && (
              <section class="psec mt-28">
                <Kicker
                  text={i18next.t("puolueet:detail.cohesion_kicker")}
                  modifier="blue"
                  dot
                />
                <div class="psec__h">
                  <h2>{i18next.t("puolueet:detail.cohesion_title")}</h2>
                  {coh.totalVotings != null && (
                    <span class="meta">
                      {i18next.t("puolueet:detail.cohesion_vote_count", {
                        count: coh.totalVotings,
                      })}
                    </span>
                  )}
                </div>
                <p class="psec__intro">{esc(coh.label)}</p>
                <div class="vote-bar mt-14">
                  <span class="v-jaa" style={`width:${coh.pct}%`}>
                    {i18next.t("puolueet:detail.cohesion_unified")} {coh.pct}%
                  </span>
                  <span class="v-ei" style={`width:${100 - coh.pct}%`}></span>
                </div>
                <div class="vote-legend mt-10">
                  <div class="vl">
                    <span class="sw" style="background:var(--hall)"></span>
                    <div>
                      <span class="vk">
                        {i18next.t("puolueet:detail.cohesion_unified")}
                      </span>
                      <span class="vv">{coh.pct}%</span>
                    </div>
                  </div>
                  <div class="vl">
                    <span class="sw" style="background:var(--red)"></span>
                    <div>
                      <span class="vk">
                        {i18next.t("puolueet:detail.cohesion_split")}
                      </span>
                      <span class="vv">{100 - coh.pct}%</span>
                    </div>
                  </div>
                </div>

                {data.splitVotes.length > 0 && (
                  <>
                    <p
                      style="font-size:14.5px;color:var(--body);line-height:1.5"
                      class="mt-22"
                    >
                      {i18next.t("puolueet:detail.cohesion_most_split")}
                    </p>
                    {data.splitVotes.map((v) => (
                      <a
                        href={`/aanestys/${v.id}`}
                        hx-get={`/aanestys/${v.id}`}
                        {...NAV}
                        class="vote-row"
                      >
                        <span class="vote-row__badge tyh">{v.dissenters}×</span>
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

            <section class="psec mt-28">
              <Kicker
                text={i18next.t("puolueet:detail.members_kicker")}
                modifier="blue"
                dot
              />
              <div class="mp-list">
                {data.members.map((m) => (
                  <a
                    href={`/edustaja/${m.id}`}
                    hx-get={`/edustaja/${m.id}`}
                    {...NAV}
                    class="mp-row"
                  >
                    <span class="c-dot">
                      <span style={`background:${m.color}`}></span>
                    </span>
                    <span class="mp-name">
                      {esc(m.firstName)} {esc(m.lastName)}
                    </span>
                    <span class="mp-party">
                      {esc(m.partyCode)}{" "}
                      <small>
                        {p.bloc === "government"
                          ? i18next.t("common:government")
                          : i18next.t("common:opposition")}
                      </small>
                    </span>
                    <span class="mp-district">{esc(m.district)}</span>
                    <span class="mp-age">{m.age ?? "–"}</span>
                    <span class="mp-att">
                      <span class="track">
                        <span
                          class="fill"
                          style={`width:${m.attendancePct ?? 0}%`}
                        ></span>
                      </span>
                      <span class="pct">
                        {m.attendancePct != null ? `${m.attendancePct} %` : "–"}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </section>

            {data.committeeChairs.length > 0 && (
              <section class="psec mt-28">
                <Kicker
                  text={i18next.t("puolueet:detail.committees_kicker")}
                  modifier="blue"
                  dot
                />
                {data.committeeChairs.map((cc) => (
                  <div class="committee-row">
                    <span class="cname">{esc(cc.committee)}</span>
                    <span class={clsx("crole", cc.isLead && "lead")}>
                      {esc(cc.name)}
                    </span>
                  </div>
                ))}
              </section>
            )}
          </div>

          <div>
            <section class="psec">
              <Kicker
                text={i18next.t("puolueet:detail.facts_kicker")}
                modifier="blue"
                dot
              />
              <dl class="mt-16 flex-col-g12">
                <div>
                  <dt style="font-family:var(--mono);font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">
                    {i18next.t("puolueet:detail.facts_gender")}
                  </dt>
                  <dd style="font-size:14px;color:var(--ink);margin:4px 0 0">
                    {i18next.t("puolueet:detail.facts_gender_format", {
                      female: p.femaleCount,
                      male: p.maleCount,
                    })}
                  </dd>
                </div>
                <div>
                  <dt style="font-family:var(--mono);font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">
                    {i18next.t("puolueet:detail.facts_avg_age")}
                  </dt>
                  <dd style="font-size:14px;color:var(--ink);margin:4px 0 0">
                    {i18next.t("puolueet:detail.facts_age_format", {
                      age: p.avgAge ?? "–",
                    })}
                  </dd>
                </div>
                <div>
                  <dt style="font-family:var(--mono);font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em">
                    {i18next.t("puolueet:detail.facts_status")}
                  </dt>
                  <dd style="font-size:14px;color:var(--ink);margin:4px 0 0">
                    {p.bloc === "government"
                      ? i18next.t("puolueet:detail.status_gov")
                      : i18next.t("puolueet:detail.status_opp")}
                  </dd>
                </div>
              </dl>
            </section>

            {data.topics.length > 0 && (
              <section class="psec mt-28">
                <Kicker
                  text={i18next.t("puolueet:detail.topics_kicker")}
                  modifier="blue"
                  dot
                />
                <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:14px">
                  {data.topics.map((t) => (
                    <span class="topic-tag">{esc(t)}</span>
                  ))}
                </div>
              </section>
            )}

            {data.recentSpeeches.length > 0 && (
              <section class="psec mt-28">
                <Kicker
                  text={i18next.t("puolueet:detail.recent_speeches_kicker")}
                  modifier="blue"
                  dot
                />
                {data.recentSpeeches.map((sp) => (
                  <div class="spoke-row">
                    <div class="st">{esc(sp.title)}</div>
                    <div class="sd">
                      {sp.date} · {esc(sp.name)}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>

        <div class="source-note mt-32">
          <span>{i18next.t("common:source")}</span>
          <span class="dset">
            Eduskunnan avoin data · MemberOfParliament + Voting
          </span>
          <span>·</span>
          <span class="fresh">
            {i18next.t("common:fetched", { timestamp: data.fetchedAt })}
          </span>
        </div>
      </div>
    </>
  );
}
