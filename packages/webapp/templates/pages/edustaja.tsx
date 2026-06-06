/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import Kicker from "../components/kicker";
import Tag from "../components/tag";
import { cite, sourceNote } from "../components/provenance";
import { esc, formatDate, pctNum } from "../helpers";
import i18next from "i18next";
import type { PersonProfileData } from "./edustaja-view-model";

interface Props {
  data: PersonProfileData;
}

export default function Edustaja({ data }: Props) {
  const p = data.person;
  const s = data.stats;
  const blocTag = p.isInGovernment ? "hall" : "opp";
  const blocLabel = p.isInGovernment
    ? i18next.t("common:government")
    : i18next.t("common:opposition");
  const topicLgThreshold =
    data.focusAreas.length > 0
      ? Math.max(2, Math.max(...data.focusAreas.map((a) => a.weight)) * 0.35)
      : 99;

  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: `${esc(p.firstName)} ${esc(p.lastName)}`,
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <div class="breadcrumb">
          <a href="/edustajat">{i18next.t("edustajat:title")}</a>
          &nbsp;›&nbsp;{" "}
          <span>
            {esc(p.firstName)} {esc(p.lastName)}
          </span>
        </div>

        <section class="bio-head">
          <div class="bio-portrait">
            <span class="initials">{esc(p.initials)}</span>
            <span class="pbar" style={`background:${p.partyColor}`}></span>
          </div>
          <div class="bio-head__main">
            <div class="bio-tags">
              <Tag text={blocLabel} modifier={blocTag} />
              <span class="tag">
                <span
                  style={`width:9px;height:9px;border-radius:50%;background:${p.partyColor};display:inline-block`}
                ></span>
                {esc(p.partyName)}
              </span>
            </div>
            <h1 class="bio-name">
              {esc(p.firstName)} {esc(p.lastName)}
            </h1>
            <div class="bio-meta">
              <span>{esc(p.currentDistrict)}</span>
              {p.birthYear ? (
                <>
                  <span class="sep"></span>
                  <span>
                    {i18next.t("edustajat:profile.born_age_format", {
                      year: p.birthYear,
                      age: esc(p.age),
                    })}
                  </span>
                </>
              ) : null}
              {p.profession ? (
                <>
                  <span class="sep"></span>
                  <span>{esc(p.profession)}</span>
                </>
              ) : null}
              {p.memberSince ? (
                <>
                  <span class="sep"></span>
                  <span>
                    {i18next.t("edustajat:mp_member_since", {
                      date: esc(p.memberSince),
                    })}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </section>

        <div class="bio-stats">
          <div class="bio-stat">
            <div class="k">
              {i18next.t("edustajat:profile.participation_label")}
            </div>
            <div class="v">
              {s.nTotal > 0
                ? cite(`${s.participationPct}<small>%</small>`, {
                    value: `${s.participationPct} % (${s.nCast} / ${s.nTotal})`,
                    caption: i18next.t(
                      "edustajat:profile.participation_caption",
                    ),
                    set: "Eduskunnan avoin data · Vote",
                    table: "Vote",
                    record: `annetut ${s.nCast} · poissa ${s.nAbsent}`,
                    markText: "*",
                  })
                : "—"}
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">{i18next.t("edustajat:profile.voted_no")}</div>
            <div class="v">
              {s.nNo > 0
                ? cite(`${s.nNo}<small>×</small>`, {
                    value: i18next.t("edustajat:profile.voted_no_caption"),
                    caption: i18next.t("edustajat:profile.voted_no_caption"),
                    set: "Eduskunnan avoin data · Vote",
                    table: "Vote",
                    record: i18next.t("edustajat:profile.voted_no_record", {
                      nYes: s.nYes,
                      nNo: s.nNo,
                      nEmpty: s.nEmpty,
                    }),
                    markText: "*",
                  })
                : "—"}
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">
              {i18next.t("edustajat:profile.own_initiatives")}
            </div>
            <div class="v">
              {s.nInitiatives > 0
                ? cite(String(s.nInitiatives), {
                    value: i18next.t("edustajat:profile.initiatives_n", {
                      count: s.nInitiatives,
                    }),
                    caption: i18next.t("edustajat:profile.initiatives_caption"),
                    set: "Eduskunnan avoin data · VaskiData",
                    table: "LegislativeInitiative",
                    record: i18next.t("edustajat:profile.initiatives_record", {
                      count: s.nInitiatives,
                    }),
                    markText: "*",
                  })
                : "—"}
            </div>
          </div>
          <div class="bio-stat">
            <div class="k">
              {i18next.t("edustajat:profile.written_questions_label")}
            </div>
            <div class="v">
              {s.nWrittenQuestions > 0
                ? cite(String(s.nWrittenQuestions), {
                    value: i18next.t("edustajat:profile.written_questions_n", {
                      count: s.nWrittenQuestions,
                    }),
                    caption: i18next.t(
                      "edustajat:profile.written_questions_caption",
                    ),
                    set: "Eduskunnan avoin data · VaskiData",
                    table: "WrittenQuestion",
                    record: i18next.t(
                      "edustajat:profile.written_questions_record",
                      { count: s.nWrittenQuestions },
                    ),
                    markText: "*",
                  })
                : "—"}
            </div>
          </div>
        </div>

        <div class="bio-grid">
          <div>
            <div class="ai">
              <div class="ai__head">
                <span class="ai__spark">✦</span>
                <span class="ai__label">
                  {i18next.t("edustajat:profile.ai_summary_heading")}
                </span>
              </div>
              {data.hasAiSummary ? null : (
                <p class="ai__body">
                  <span class="text-muted">
                    {i18next.t("edustajat:profile.ai_summary_pending")}
                  </span>
                </p>
              )}
            </div>

            <section class="psec">
              <Kicker
                text={i18next.t("edustajat:profile.voting_section_kicker")}
              />
              <div class="psec__h">
                <h2>{i18next.t("edustajat:profile.voting_section_title")}</h2>
                <span class="meta">
                  {i18next.t("edustajat:profile.voting_section_vote_count", {
                    count: s.nTotal,
                  })}
                </span>
              </div>
              <p class="psec__intro">
                {i18next.t("edustajat:profile.voting_intro_prefix", {
                  cast: s.nCast,
                  pct: s.participationPct,
                })}
                {s.nYes > 0
                  ? ` ${i18next.t("edustajat:profile.voting_yes_votes", { count: s.nYes })}`
                  : ""}
                {s.nNo > 0
                  ? ` ${i18next.t("edustajat:profile.voting_no_votes", { count: s.nNo })}`
                  : ""}
                {s.nEmpty > 0
                  ? ` ${i18next.t("edustajat:profile.voting_empty_votes", { count: s.nEmpty })}`
                  : ""}
                {s.nAbsent > 0
                  ? ` ${i18next.t("edustajat:profile.voting_absent_votes", { count: s.nAbsent })}`
                  : ""}{" "}
                {i18next.t("edustajat:profile.voting_dissent_heading")}
              </p>
              <div class="vote-bar">
                {s.nYes > 0 ? (
                  <span
                    class="v-jaa"
                    style={`width:${pctNum(s.nYes, s.nTotal)}%`}
                  >
                    {i18next.t("edustajat:profile.vote_yes_label", {
                      count: s.nYes,
                    })}
                  </span>
                ) : null}
                {s.nAbsent > 0 ? (
                  <span
                    class="v-poi"
                    style={`width:${pctNum(s.nAbsent, s.nTotal)}%`}
                  >
                    {i18next.t("edustajat:profile.vote_absent_label", {
                      count: s.nAbsent,
                    })}
                  </span>
                ) : null}
                {s.nNo > 0 ? (
                  <span
                    class="v-ei"
                    style={`width:${pctNum(s.nNo, s.nTotal)}%`}
                  ></span>
                ) : null}
              </div>
              <div class="vote-legend">
                <div class="vl">
                  <span class="sw" style="background:var(--hall)"></span>
                  <div>
                    <span class="vk">{i18next.t("common:yes")}</span>
                    <span class="vv">{s.nYes}</span>
                  </div>
                </div>
                <div class="vl">
                  <span class="sw" style="background:var(--red)"></span>
                  <div>
                    <span class="vk">{i18next.t("common:no")}</span>
                    <span class="vv">{s.nNo}</span>
                  </div>
                </div>
                <div class="vl">
                  <span class="sw" style="background:var(--opp)"></span>
                  <div>
                    <span class="vk">{i18next.t("common:empty")}</span>
                    <span class="vv">{s.nEmpty}</span>
                  </div>
                </div>
                <div class="vl">
                  <span class="sw" style="background:var(--paper-3)"></span>
                  <div>
                    <span class="vk">{i18next.t("common:absent")}</span>
                    <span class="vv">{s.nAbsent}</span>
                  </div>
                </div>
              </div>
              {data.dissents.length > 0 ? (
                <div class="dissent">
                  <div class="dissent__lead mt-24">
                    <span class="tag tag--opp dissent-tag">
                      {data.dissents[0].mpVote === "Jaa"
                        ? i18next.t("edustajat:profile.dissent_jayes")
                        : data.dissents[0].mpVote === "Tyhjää"
                          ? i18next.t("common:empty")
                          : i18next.t("common:no")}
                    </span>{" "}
                    <b>
                      {i18next.t("edustajat:profile.dissent_all_times", {
                        count: data.dissents.length,
                      })}
                    </b>
                  </div>
                  {data.dissents.map((d) => (
                    <div class="vote-row">
                      <div class="vote-row__badge">{esc(d.mpVote)}</div>
                      <div>
                        <div class="vote-row__title">
                          {esc(d.title || d.sectionTitle)}
                        </div>
                        <div class="vote-row__sub">
                          {d.startTime ? (
                            <span class="date">{formatDate(d.startTime)}</span>
                          ) : null}
                          {d.sectionTitle ? (
                            <>
                              <span>·</span>
                              <span>{esc(d.sectionTitle)}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {sourceNote({
                dataset: "Eduskunnan avoin data · Vote",
                fetchedAt: data.fetchedAt,
              })}
            </section>

            {data.initiatives.length > 0 || data.questions.length > 0 ? (
              <section class="psec">
                <Kicker
                  text={i18next.t(
                    "edustajat:profile.initiatives_section_kicker",
                  )}
                />
                <div class="psec__h">
                  <h2>
                    {i18next.t("edustajat:profile.initiatives_section_title")}
                  </h2>
                  <span class="meta">
                    {i18next.t("edustajat:profile.initiatives_section_meta", {
                      initiatives: s.nInitiatives,
                      questions: s.nWrittenQuestions,
                    })}
                  </span>
                </div>
                <p class="psec__intro">
                  {i18next.t("edustajat:profile.initiatives_section_intro")}
                </p>
                {data.initiatives.slice(0, 5).map((init) => (
                  <a class="act-row" href={`/asiakirja/${init.documentId}`}>
                    <div class="act-row__id">
                      {esc(init.parliamentIdentifier)}
                    </div>
                    <div>
                      <div class="act-row__title">{esc(init.title ?? "")}</div>
                      <div class="act-row__sub">
                        {esc(init.initiativeTypeLabel)}
                        {init.relationRole === "first_signer"
                          ? ` · ${i18next.t("edustajat:profile.first_signer")}`
                          : ` · ${i18next.t("edustajat:profile.signer")}`}
                      </div>
                    </div>
                    <div class="act-row__date">
                      {init.submissionDate
                        ? formatDate(init.submissionDate)
                        : ""}
                    </div>
                  </a>
                ))}
                {data.questions.slice(0, 5).map((q) => (
                  <a
                    class="act-row"
                    href={
                      q.documentId ? `/asiakirja/${q.documentId}` : undefined
                    }
                  >
                    <div class="act-row__id">{esc(q.parliamentIdentifier)}</div>
                    <div>
                      <div class="act-row__title">{esc(q.title ?? "")}</div>
                      <div class="act-row__sub">{esc(q.questionKindLabel)}</div>
                    </div>
                    <div class="act-row__date">
                      {q.submissionDate ? formatDate(q.submissionDate) : ""}
                    </div>
                  </a>
                ))}
                {sourceNote({
                  dataset: "Eduskunnan avoin data · VaskiData",
                  fetchedAt: data.fetchedAt,
                })}
              </section>
            ) : null}

            {data.committees.length > 0 ? (
              <section class="psec">
                <Kicker
                  text={i18next.t("edustajat:profile.committees_kicker")}
                />
                <div class="psec__h">
                  <h2>{i18next.t("edustajat:profile.committees_title")}</h2>
                  <span class="meta">
                    {i18next.t("edustajat:profile.committees_active", {
                      count: data.committees.filter((c) => !c.endDate).length,
                    })}
                  </span>
                </div>
                <div class="committee-list">
                  {data.committees.map((c) => (
                    <div class="committee-row">
                      <span class="cname">{esc(c.committeeName)}</span>
                      <span
                        class={clsx("crole", {
                          lead: [
                            "jäsen",
                            "puheenjohtaja",
                            "varapuheenjohtaja",
                          ].includes(c.role.toLowerCase()),
                        })}
                      >
                        {esc(c.role)}
                        {c.startDate
                          ? i18next.t(
                              "edustajat:profile.committee_since_format",
                              {
                                date: formatDate(c.startDate),
                              },
                            )
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
                {sourceNote({
                  dataset: "Eduskunnan avoin data · Committee",
                  fetchedAt: data.fetchedAt,
                })}
              </section>
            ) : null}
          </div>

          <aside>
            {data.focusAreas.length > 0 ? (
              <div class="rail__item pt-0">
                <Kicker text={i18next.t("edustajat:profile.topics_kicker")} />
                <p class="psec__desc">
                  {i18next.t("edustajat:profile.topics_description")}
                </p>
                <div class="topics">
                  {data.focusAreas.map((area) => (
                    <span
                      class={clsx("topic-tag", {
                        lg: area.weight >= topicLgThreshold,
                      })}
                    >
                      {esc(area.label)}
                      <span class="tc">{area.weight}</span>
                    </span>
                  ))}
                </div>
                {sourceNote({
                  dataset: "Eduskunnan avoin data · WrittenQuestion, Speech",
                  fetchedAt: data.fetchedAt,
                })}
              </div>
            ) : null}

            {data.speeches.length > 0 ? (
              <div class="rail__item">
                <Kicker
                  text={i18next.t("edustajat:profile.recent_speeches_kicker")}
                />
                <p class="psec__desc psec__desc--tight">
                  {i18next.t("edustajat:profile.recent_speeches_subtitle")}
                </p>
                {data.speeches.map((sp) => (
                  <div class="spoke-row">
                    <div class="st">{esc(sp.sectionTitle ?? "")}</div>
                    <div class="sd">
                      {sp.startTime
                        ? `${formatDate(sp.startTime)}${sp.speechType ? ` · ${esc(sp.speechType)}` : ""}`
                        : sp.speechType
                          ? esc(sp.speechType)
                          : ""}
                    </div>
                  </div>
                ))}
                {sourceNote({
                  dataset: `Speech · ${p.firstName} ${p.lastName}`,
                  fetchedAt: data.fetchedAt,
                })}
              </div>
            ) : null}

            <div class="rail__item">
              <Kicker text={i18next.t("edustajat:profile.basics_kicker")} />
              <dl class="bio-dl">
                {p.birthYear ? (
                  <>
                    <dt>{i18next.t("edustajat:profile.basics_age")}</dt>
                    <dd>
                      {i18next.t("edustajat:profile.age_format", {
                        age: esc(p.age),
                      })}{" "}
                      (
                      {i18next.t("edustajat:profile.born_format", {
                        year: p.birthYear,
                      })}
                      )
                    </dd>
                  </>
                ) : null}
                <dt>{i18next.t("edustajat:profile.basics_district")}</dt>
                <dd>{esc(p.currentDistrict)}</dd>
                {p.profession ? (
                  <>
                    <dt>{i18next.t("edustajat:profile.basics_profession")}</dt>
                    <dd>{esc(p.profession)}</dd>
                  </>
                ) : null}
                <dt>{i18next.t("edustajat:profile.basics_party")}</dt>
                <dd>{esc(p.partyName)}</dd>
                {p.memberSince ? (
                  <>
                    <dt>
                      {i18next.t("edustajat:profile.basics_member_since")}
                    </dt>
                    <dd>{esc(p.memberSince)}</dd>
                  </>
                ) : null}
                <dt>{i18next.t("edustajat:profile.basics_status")}</dt>
                <dd class={p.isInGovernment ? "gov" : "opp"}>{blocLabel}</dd>
              </dl>
              {sourceNote({
                dataset: `MemberOfParliament · ${p.id}`,
                fetchedAt: data.fetchedAt,
              })}
            </div>

            {data.baselines ? (
              <div class="rail__item">
                <Kicker
                  text={i18next.t("edustajat:profile.baselines_kicker")}
                />
                <p class="psec__desc psec__desc--tight">
                  {i18next.t("edustajat:profile.baselines_description")}
                </p>
                <dl class="baselines-dl">
                  <dt>{i18next.t("edustajat:profile.baselines_speeches")}</dt>
                  <dd>
                    {i18next.t("edustajat:profile.baselines_detail_format", {
                      own: data.baselines.speech.own,
                      parlAbbr: i18next.t(
                        "edustajat:profile.baselines_abbr_parliament",
                      ),
                      parl: data.baselines.speech.parliamentAvg.toFixed(0),
                      partyAbbr: i18next.t(
                        "edustajat:profile.baselines_abbr_party",
                      ),
                      party: data.baselines.speech.partyAvg.toFixed(0),
                    })}
                  </dd>
                  <dt>
                    {i18next.t("edustajat:profile.baselines_initiatives")}
                  </dt>
                  <dd>
                    {i18next.t("edustajat:profile.baselines_detail_format", {
                      own: data.baselines.initiative.own,
                      parlAbbr: i18next.t(
                        "edustajat:profile.baselines_abbr_parliament",
                      ),
                      parl: data.baselines.initiative.parliamentAvg.toFixed(0),
                      partyAbbr: i18next.t(
                        "edustajat:profile.baselines_abbr_party",
                      ),
                      party: data.baselines.initiative.partyAvg.toFixed(0),
                    })}
                  </dd>
                  <dt>{i18next.t("edustajat:profile.baselines_questions")}</dt>
                  <dd>
                    {i18next.t("edustajat:profile.baselines_detail_format", {
                      own: data.baselines.writtenQuestion.own,
                      parlAbbr: i18next.t(
                        "edustajat:profile.baselines_abbr_parliament",
                      ),
                      parl: data.baselines.writtenQuestion.parliamentAvg.toFixed(
                        0,
                      ),
                      partyAbbr: i18next.t(
                        "edustajat:profile.baselines_abbr_party",
                      ),
                      party: data.baselines.writtenQuestion.partyAvg.toFixed(0),
                    })}
                  </dd>
                  <dt>
                    {i18next.t("edustajat:profile.baselines_participation")}
                  </dt>
                  <dd>
                    {i18next.t(
                      "edustajat:profile.baselines_detail_pct_format",
                      {
                        own: data.baselines.participation.own,
                        parlAbbr: i18next.t(
                          "edustajat:profile.baselines_abbr_parliament",
                        ),
                        parl: data.baselines.participation.parliamentAvg,
                        partyAbbr: i18next.t(
                          "edustajat:profile.baselines_abbr_party",
                        ),
                        party: data.baselines.participation.partyAvg,
                      },
                    )}
                  </dd>
                </dl>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  );
}
