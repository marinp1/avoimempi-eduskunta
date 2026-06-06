/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import i18next from "i18next";
import Kicker from "#server/components/kicker";
import type {
  DebateData,
  SpeechEntry,
  VoteResultData,
  DocLink,
} from "../pages/debate.view-model";

interface Props {
  data: DebateData;
}

export default function Keskustelu({ data }: Props) {
  const d = data;
  const sec = d.section;
  const ses = d.session;

  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: i18next.t("components:keskustelu.title_format", {
            title: sec.title,
          }),
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <div style="padding-top:16px;font-size:13px;color:var(--muted)">
          <a href="/istunnot" style="color:var(--blue)">
            {i18next.t("components:keskustelu.breadcrumb_session")}
          </a>
          &nbsp;›&nbsp;{" "}
          <a href={`/istunto/${ses.key}`} style="color:var(--blue)">
            {ses.title}
          </a>
          &nbsp;›&nbsp;{" "}
          <span>
            {i18next.t("components:keskustelu.breadcrumb_discussion")}
            {sec.itemNumber
              ? ` · ${i18next.t("components:keskustelu.breadcrumb_item_format", { number: sec.itemNumber })}`
              : ""}
          </span>
        </div>

        <DebateHead data={data} />
        <DocToolbar docs={d.relatedDocs} sessionKey={ses.key} />
        <AiSummaryBlock
          groupSpeechCount={sec.groupSpeechCount}
          totalSpeeches={sec.totalSpeeches}
        />
        <ContextSection data={data} />
        <FilterToolbar
          groupCount={sec.groupSpeechCount}
          blocStats={d.blocStats}
        />
        <SpeechTranscript speeches={d.speeches} section={sec} />
        {d.responseSpeeches.length > 0 && (
          <MoreSpeeches
            speeches={d.responseSpeeches}
            total={d.blocStats.totalReply}
            sessionKey={ses.key}
          />
        )}
        {d.votings.length > 0 && (
          <VoteOutcome votings={d.votings} fetchedAt={d.fetchedAt} />
        )}
        <SpeechSourceNote fetchedAt={d.fetchedAt} />
      </div>
    </>
  );
}

function DebateHead({ data }: Props) {
  const sec = data.section;
  const ses = data.session;

  return (
    <section class="doc-head">
      <div class="doc-head__top">
        {sec.itemNumber && (
          <span class="doc-id">
            {i18next.t("components:keskustelu.breadcrumb_item_format", {
              number: sec.itemNumber,
            })}
          </span>
        )}
        <span class="doc-type">
          {sec.processingTitle
            ? i18next.t("components:keskustelu.type_format", {
                processing: sec.processingTitle,
              })
            : i18next.t("components:keskustelu.type_label")}
        </span>
        {sec.identifier && (
          <span class="tag tag--ghost" style="margin-left:auto">
            {sec.identifier}
          </span>
        )}
      </div>
      <h1>
        {sec.title
          ? i18next.t("components:keskustelu.heading_format", {
              title: sec.title.toLowerCase(),
            })
          : i18next.t("components:keskustelu.heading_prefix")}
      </h1>
      <div class="debate-meta">
        <span>
          <b>{ses.dateLabel}</b>
        </span>
        <span class="sep"></span>
        {sec.timeRange && (
          <>
            <span>{sec.timeRange}</span>
            <span class="sep"></span>
          </>
        )}
        <span>
          <b>{sec.totalSpeeches}</b>{" "}
          {i18next.t("components:keskustelu.speech_count")}
        </span>
        <span class="sep"></span>
        <span>
          <b>{sec.groupSpeechCount}</b>{" "}
          {i18next.t("components:keskustelu.group_speech_count")}
        </span>
        <span class="sep"></span>
        <a href={`/istunto/${ses.key}`} style="color:var(--blue)">
          {i18next.t("common:open_istunto")}
        </a>
      </div>
    </section>
  );
}

function DocToolbar({
  docs,
  sessionKey,
}: {
  docs: DocLink[];
  sessionKey: string;
}) {
  if (docs.length === 0) return null;

  return (
    <div class="doc-toolbar">
      {docs.map((doc) =>
        doc.documentId ? (
          <a href={`/asiakirja/${doc.documentId}`} class="tbtn">
            <span class="ic">
              {doc.typeName?.includes("mietint") ? "▤" : "↗"}
            </span>{" "}
            {doc.label ?? doc.tunnus}
          </a>
        ) : (
          <span class="tbtn">
            <span class="ic">▤</span> {doc.tunnus}
          </span>
        ),
      )}
      <a href={`/istunto/${sessionKey}`} class="tbtn">
        <span class="ic">⚖</span>{" "}
        {i18next.t("components:keskustelu.toolbar_session_votings")}
      </a>
      <span class="grow"></span>
      <button class="tbtn">
        <span class="ic">⧉</span> {i18next.t("common:share")}
      </button>
    </div>
  );
}

function AiSummaryBlock({
  groupSpeechCount,
  totalSpeeches,
}: {
  groupSpeechCount: number;
  totalSpeeches: number;
}) {
  return (
    <div class="summary">
      <div class="summary__bar">
        <span class="l">
          <span class="spark">✦</span>
          <span class="lbl">
            {i18next.t("components:keskustelu.ai_summary_label")}
          </span>
        </span>
        <span class="read">
          {i18next.t("components:keskustelu.ai_summary_meta", {
            group: groupSpeechCount,
            total: totalSpeeches,
          })}
        </span>
      </div>
      <div class="summary__in">
        <div class="summary__q">
          {i18next.t("components:keskustelu.ai_question")}
        </div>
        <p class="summary__lead">
          {i18next.t("components:keskustelu.ai_not_available")}
        </p>
        <div class="summary__foot">
          <span class="summary__disc">
            {i18next.t("components:keskustelu.ai_disclaimer")}
          </span>
        </div>
      </div>
    </div>
  );
}

function ContextSection({ data }: Props) {
  const sec = data.section;
  const ses = data.session;

  return (
    <section class="ph mt-30" id="asiayhteys">
      <Kicker
        text={i18next.t("components:keskustelu.context_kicker")}
        modifier="blue"
        dot
      />
      <div class="ph__head">
        <h2>{sec.title}</h2>
        {sec.identifier && <span class="meta">{sec.identifier}</span>}
      </div>
      <div class="ctx-grid">
        <div class="ctx-box">
          <h3>{i18next.t("components:keskustelu.context_info_title")}</h3>
          <ul class="ctx-themes">
            <li>
              <b>{i18next.t("components:keskustelu.context_session")}</b>{" "}
              <a href={`/istunto/${ses.key}`} style="color:var(--blue)">
                {ses.key}
              </a>
            </li>
            <li>
              <b>{i18next.t("components:keskustelu.context_time")}</b>{" "}
              {ses.dateLabel}
            </li>
            <li>
              <b>{i18next.t("components:keskustelu.context_speeches")}</b>{" "}
              {sec.totalSpeeches} (
              {i18next.t("components:keskustelu.group_speech_count", {
                count: sec.groupSpeechCount,
              })}
              )
            </li>
            {sec.processingTitle && (
              <li>
                <b>{i18next.t("components:keskustelu.context_processing")}</b>{" "}
                {sec.processingTitle}
              </li>
            )}
          </ul>
        </div>
        <div class="ctx-box">
          <h3>
            {sec.identifier
              ? i18next.t("components:keskustelu.context_doc_title")
              : i18next.t("components:keskustelu.context_info_title_extra")}
            <small>
              {i18next.t("components:keskustelu.context_doc_subtitle")}
            </small>
          </h3>
          <ul class="ctx-list">
            {sec.identifier && (
              <li>
                <span class="n">1</span>
                {i18next.t("components:keskustelu.context_doc_identifier")}{" "}
                <b>{sec.identifier}</b>
              </li>
            )}
            <li>
              <span class="n">{sec.identifier ? "2" : "1"}</span>
              {i18next.t("components:keskustelu.context_source")}{" "}
              <b>{i18next.t("components:keskustelu.context_source_value")}</b>
            </li>
          </ul>
          <div class="ctx-src">
            {i18next.t("components:keskustelu.context_source_detail")}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterToolbar({
  groupCount,
}: {
  groupCount: number;
  blocStats?: { groupGov: number; groupOpp: number };
}) {
  return (
    <>
      <div class="toolbar">
        <label class="search">
          <span class="ic">⌕</span>
          <input
            id="sp-search"
            type="text"
            placeholder={i18next.t("components:keskustelu.search_placeholder")}
          />
        </label>
        <span class="count">
          <b id="sp-count">{groupCount}</b>{" "}
          {i18next.t("components:keskustelu.group_speech_count_label", {
            count: groupCount,
          })}
        </span>
      </div>
      <div class="fchips">
        <button class="fchip is-active" data-filter="all">
          {i18next.t("common:all")}
        </button>
        <button class="fchip" data-filter="hallitus">
          <span class="pdot" style="background:var(--hall)"></span>
          {i18next.t("common:government")}
        </button>
        <button class="fchip" data-filter="oppositio">
          <span class="pdot" style="background:var(--opp)"></span>
          {i18next.t("common:opposition")}
        </button>
      </div>
    </>
  );
}

function SpeechTranscript({
  speeches,
}: {
  speeches: SpeechEntry[];
  section?: { itemNumber: string | null };
}) {
  return (
    <>
      <p class="kicker" style="margin:26px 0 14px">
        {i18next.t("components:keskustelu.speech_section_header")}
      </p>
      <p style="font-size:14px;line-height:1.55;color:var(--muted);max-width:66ch;margin:0 0 16px">
        {i18next.t("components:keskustelu.speech_section_intro")}
      </p>
      <div class="transcript" id="transcript">
        {speeches.map((sp) => (
          <SpeechCard speech={sp} />
        ))}
      </div>
      <div
        id="sp-empty"
        hidden
        style="text-align:center;color:var(--muted);padding:34px 0"
      >
        {i18next.t("components:keskustelu.none_found")}
      </div>
    </>
  );
}

function SpeechCard({ speech: sp }: { speech: SpeechEntry }) {
  return (
    <article class="speech" data-bloc={sp.bloc} data-text={sp.searchText}>
      <div class="speech__av">
        <span>{sp.initials}</span>
        <span class="pbar" style={`background:${sp.partyColor}`}></span>
      </div>
      <div class="speech__main">
        <div class="speech__head">
          <span class="speech__name">
            {sp.firstName} {sp.lastName}
          </span>
          <span class="tag">
            <span
              style={`width:9px;height:9px;border-radius:50%;background:${sp.partyColor};display:inline-block`}
            ></span>{" "}
            {sp.partyName}
          </span>
          <span class={clsx("speech__role", sp.roleClass)}>{sp.roleLabel}</span>
          <span class="speech__time">
            {sp.timeLabel}
            {sp.durationLabel ? ` · ${sp.durationLabel}` : ""}
          </span>
        </div>
        {sp.summary && (
          <div class="speech__sum">
            <span class="speech__sum-tag">
              <span class="sp">✦</span>
              {i18next.t("components:keskustelu.speech_ai_tag")}
            </span>
            <p>{sp.summary}</p>
          </div>
        )}
        <div class="speech__body">{sp.content && <p>{sp.content}</p>}</div>
        <div class="speech__foot">
          <span class="meta">
            {sp.contentLength.toLocaleString("fi-FI")}{" "}
            {i18next.t("common:characters")}
            {sp.durationLabel ? ` · ${sp.durationLabel}` : ""}
            {" · "}
            {i18next.t("common:language_fi")}
          </span>
          <button type="button" class="link-arrow">
            {i18next.t("common:open_in_minutes")}
          </button>
        </div>
      </div>
    </article>
  );
}

function MoreSpeeches({
  speeches,
  total,
  sessionKey,
}: {
  speeches: SpeechEntry[];
  total: number;
  sessionKey: string;
}) {
  if (speeches.length === 0) return null;
  const sample = speeches.slice(0, 8);

  return (
    <div class="more-speeches">
      <h4>{i18next.t("components:keskustelu.response_section_title")}</h4>
      <p style="font-size:14.5px;line-height:1.55;color:var(--body);margin:0">
        {i18next.t("components:keskustelu.response_section_intro", {
          count: total,
        })}
      </p>
      {sample.map((sp) => (
        <div class="reply-row">
          <span class="d" style={`background:${sp.partyColor}`}></span>
          <span class="nm">
            {sp.firstName} {sp.lastName} <small>{sp.partyName}</small>
          </span>
          <span class="tm">{sp.timeLabel}</span>
        </div>
      ))}
      {speeches.length > 8 && (
        <div class="reply-row">
          <span class="d" style="background:var(--faint)"></span>
          <span class="nm">
            <small>
              {i18next.t("components:keskustelu.response_more", {
                count: speeches.length - 8,
              })}
            </small>
          </span>
          <span class="tm"></span>
        </div>
      )}
      <div class="mt-14 flex-wrap-g16">
        <a href={`/istunto/${sessionKey}`} class="link-arrow">
          {i18next.t("common:show_all_speeches", { count: total })}
        </a>
        <a href={`/istunto/${sessionKey}`} class="link-arrow">
          {i18next.t("common:back_to_istuntoon")}
        </a>
      </div>
    </div>
  );
}

function VoteOutcome({
  votings,
  fetchedAt,
}: {
  votings: VoteResultData[];
  fetchedAt: string;
}) {
  const mainVote = votings[0]!;
  const hasMultiple = votings.length > 1;

  return (
    <section class="ph" id="paatos">
      <Kicker
        text={i18next.t("components:keskustelu.vote_section_kicker")}
        modifier="blue"
        dot
      />
      <div class="ph__head">
        <h2>{i18next.t("components:keskustelu.vote_section_title")}</h2>
        <span class="meta">
          {i18next.t("components:keskustelu.vote_section_meta", {
            count: votings.length,
          })}
        </span>
      </div>
      <p class="ph__intro">
        {i18next.t("components:keskustelu.vote_section_intro")}{" "}
        {hasMultiple
          ? i18next.t("components:keskustelu.vote_section_intro_multiple")
          : ""}
      </p>
      <div class="ag-votes mt-8">
        {votings.map((v) => (
          <div class="agvote">
            <div class="agvote__t">{v.title}</div>
            <div class="agvote__bar">
              <span class="j" style={`width:${v.yesPct.toFixed(1)}%`}></span>
              <span class="e" style={`width:${v.noPct.toFixed(1)}%`}></span>
            </div>
            <div class="agvote__n">
              <span class="j">{v.nYes}</span>–<span class="e">{v.nNo}</span>
              <span class={clsx("out", v.outcomeClass)}>{v.outcome}</span>
            </div>
          </div>
        ))}
      </div>
      <div class="decision mt-18">
        <div class="decision__icon">
          {mainVote.outcomeClass === "ok" ? "✓" : "✗"}
        </div>
        <div class="decision__main">
          <div class="t">
            {mainVote.outcomeClass === "ok"
              ? i18next.t("components:keskustelu.vote_decision_approved", {
                  yes: mainVote.nYes,
                  no: mainVote.nNo,
                })
              : i18next.t("components:keskustelu.vote_decision_rejected", {
                  yes: mainVote.nYes,
                  no: mainVote.nNo,
                })}
          </div>
          <div class="s">
            {i18next.t("components:keskustelu.vote_result_text", {
              yes: mainVote.nYes,
              no: mainVote.nNo,
            })}
          </div>
        </div>
      </div>
      <div class="source-note">
        <span>{i18next.t("common:source")}</span>
        <span class="dset">Eduskunnan avoin data · Voting</span>
        <span>·</span>
        <span class="fresh">
          {i18next.t("common:fetched", { timestamp: fetchedAt })}
        </span>
      </div>
    </section>
  );
}

function SpeechSourceNote({ fetchedAt }: { fetchedAt: string }) {
  return (
    <div class="source-note mt-32">
      <span>{i18next.t("common:source")}</span>
      <span class="dset">Eduskunnan avoin data · Speech + SpeechContent</span>
      <span>·</span>
      <span class="fresh">
        {i18next.t("common:fetched", { timestamp: fetchedAt })}
      </span>
    </div>
  );
}
