/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import i18next from "i18next";
import type {
  SessionDetailData,
  AgendaSectionData,
  AgendaItemData,
  VoteResultData,
  AbsenteeGroup,
} from "./detail.view-model";

const NAV = {
  "hx-target": "#main-content",
  "hx-push-url": "true",
  "hx-swap": "innerHTML",
} as const;

interface Props {
  data: SessionDetailData;
}

const REASON_LABEL: Record<string, string> = {
  e: "e",
  h: "h",
  "-": "\u2013",
};

export default function Istunto({ data }: Props) {
  const s = data.session;
  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: s.title,
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <div style="padding-top:16px;font-size:13px;color:var(--muted)">
          <a
            href="/istunnot"
            hx-get="/istunnot"
            {...NAV}
            style="color:var(--blue)"
          >
            {i18next.t("nav:sessions")}
          </a>
          &nbsp;›&nbsp; <span>{s.title}</span>
        </div>

        <section class="doc-head">
          <div class="doc-head__top">
            <span class="doc-id">{s.ptkId}</span>
            <span class="doc-type">{s.typeLabel}</span>
            <span
              class={clsx("sess-state", s.stateClass)}
              style="margin-left:auto"
            >
              {s.stateLabel}
            </span>
          </div>
          <h1>{s.title}</h1>
          <div class="sess-meta">
            <span>
              <b>{s.dateLabel}</b>
            </span>
            <span class="sep"></span>
            <span>{s.timeRange}</span>
            <span class="sep"></span>
            <span>
              {i18next.t("common:duration")} <b>{s.duration}</b>
            </span>
            <span class="sep"></span>
            <span>
              <b>{s.itemCount}</b> {i18next.t("common:agenda_items")}
            </span>
            <span class="sep"></span>
            <span>
              <b>{s.votingCount}</b>{" "}
              {s.votingCount === 1
                ? i18next.t("common:voting_count_one")
                : i18next.t("common:voting_count_many")}
            </span>
            <span class="sep"></span>
            <span>
              <b>{s.speechCount}</b> {i18next.t("common:speech_count")}
            </span>
          </div>
        </section>

        <div class="doc-toolbar">
          <a href="#" class="tbtn">
            <span class="ic">↗</span>{" "}
            {i18next.t("sessions:detail.toolbar_minutes")}
          </a>
          <a href="#" class="tbtn">
            <span class="ic">▤</span>{" "}
            {i18next.t("sessions:detail.toolbar_agenda")}
          </a>
          <a href="#paatosasiat" class="tbtn">
            <span class="ic">⚖</span>{" "}
            {i18next.t("sessions:detail.toolbar_votings")}
          </a>
          <span class="grow"></span>
          <button class="tbtn">
            <span class="ic">⧉</span> {i18next.t("common:share")}
          </button>
        </div>

        <nav class="sess-jump">
          <a href="#lasnaolo">{i18next.t("sessions:detail.jump_attendance")}</a>
          <a href="#paatosasiat">
            {i18next.t("sessions:detail.jump_voting")}
            {s.votingCount > 0
              ? ` \u00b7 ${i18next.t("votings:count", { count: s.votingCount })}`
              : ""}
          </a>
          <a href="#keskustelut">
            {i18next.t("sessions:detail.jump_discussion")}
          </a>
          <a href="#poydalle">{i18next.t("sessions:detail.jump_tabled")}</a>
        </nav>

        <div class="summary">
          <div class="summary__bar">
            <span class="l">
              <span class="spark">✦</span>
              <span class="lbl">
                {i18next.t("sessions:detail.ai_summary_label")}
              </span>
            </span>
            <span class="read">
              {i18next.t("sessions:detail.ai_summary_meta", {
                items: s.itemCount,
                votes: s.votingCount,
                speeches: s.speechCount,
              })}
            </span>
          </div>
          <div class="summary__in">
            <div class="summary__q">
              {i18next.t("sessions:detail.ai_summary_question")}
            </div>
            <p class="summary__lead">
              {i18next.t("sessions:detail.ai_summary_not_available")}
            </p>
          </div>
        </div>
      </div>

      {data.attendance && (
        <div class="wrap">
          <AttendanceSection attendance={data.attendance} />
        </div>
      )}

      {data.votingSections.length > 0 && (
        <div class="wrap">
          <VotingSections sections={data.votingSections} />
        </div>
      )}

      {data.discussionSections.length > 0 && (
        <div class="wrap">
          <DiscussionSections sections={data.discussionSections} />
        </div>
      )}

      {data.tabledItems.length > 0 && (
        <div class="wrap">
          <TabledSection items={data.tabledItems} />
        </div>
      )}
    </>
  );
}

interface AttendanceSectionData {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalMembers: number;
  parties: {
    code: string;
    label: string;
    color: string;
    total: number;
    absent: number;
    bloc: string;
  }[];
  absenteesByParty: AbsenteeGroup[];
  rollCallTitle: string | null;
  rollCallTime: string | null;
}

function AttendanceSection({
  attendance,
}: {
  attendance: AttendanceSectionData;
}) {
  const presentPct =
    attendance.totalMembers > 0
      ? (attendance.totalPresent / attendance.totalMembers) * 100
      : 0;
  const absentPct =
    attendance.totalMembers > 0
      ? (attendance.totalAbsent / attendance.totalMembers) * 100
      : 0;
  return (
    <section class="attend" id="lasnaolo">
      <p class="kicker" style="margin:30px 0 6px">
        {i18next.t("sessions:detail.attendance_roll_call")}{" "}
        {attendance.rollCallTime
          ? `${i18next.t("sessions:detail.attendance_time_format", { time: attendance.rollCallTime.slice(11, 16) })}`
          : ""}
      </p>
      <div class="psec__h" style="margin-bottom:18px">
        <h2>{i18next.t("sessions:detail.attendance_title")}</h2>
        <span class="meta">
          {i18next.t("sessions:detail.attendance_agenda_item")}
        </span>
      </div>

      <div class="attend__grid">
        <div class="attend__sum">
          <div class="att-big">
            <span class="n">{attendance.totalPresent}</span>
            <span class="of">
              / {attendance.totalMembers}{" "}
              {i18next.t("sessions:detail.attendance_present_suffix")}
            </span>
          </div>
          <div class="att-cap">
            {i18next.t("sessions:detail.attendance_caption")}
          </div>
          <div class="att-bar">
            <span class="pres" style={`width:${presentPct.toFixed(0)}%`}></span>
            <span class="abs" style={`width:${absentPct.toFixed(0)}%`}></span>
          </div>
          <div class="att-chips">
            <div class="att-chip">
              <span class="sw" style="background:var(--hall)"></span>
              {i18next.t("sessions:detail.attendance_present")}{" "}
              <b>{attendance.totalPresent}</b>
            </div>
            <div class="att-chip">
              <span class="sw ring"></span>
              {i18next.t("sessions:detail.attendance_absent")}{" "}
              <b>{attendance.totalAbsent}</b>
            </div>
            {attendance.totalLate > 0 && (
              <div class="att-chip">
                <span class="sw" style="background:var(--opp)"></span>
                {i18next.t("sessions:detail.attendance_late")}{" "}
                <b>{attendance.totalLate}</b>
              </div>
            )}
          </div>
        </div>

        <div class="seatwrap">
          <SeatGrid
            parties={attendance.parties}
            totalPresent={attendance.totalPresent}
            totalAbsent={attendance.totalAbsent}
          />
          <SeatLegend parties={attendance.parties} />
        </div>
      </div>

      <div class="absentees">
        <div class="psec__h" style="margin-bottom:6px">
          <h3 style="font-size:var(--fs-h3)">
            {i18next.t("sessions:detail.absentees_title")}
          </h3>
          <span class="meta">
            {attendance.totalAbsent}{" "}
            {i18next.t("sessions:detail.absentees_subtitle")}
            {attendance.totalLate > 0
              ? ` \u00b7 ${i18next.t("sessions:detail.absentees_late_format", { count: attendance.totalLate })}`
              : ""}
          </span>
        </div>
        {attendance.absenteesByParty
          .filter((g) => g.members.length > 0)
          .map((group) => (
            <div class="abs-row">
              <div class="abs-row__p">
                <span class="d" style={`background:${group.color}`}></span>
                {group.partyCode} <small>{group.members.length}</small>
              </div>
              <div class="abs-names">
                {group.members.map((m, i) => (
                  <span class="nm">
                    {i > 0 && <span> &nbsp;\u00b7&nbsp; </span>}
                    {m.lastName} {m.firstName}
                    {m.isLate ? (
                      <span class="r">
                        {" "}
                        {i18next.t("sessions:detail.absentees_late_label")}
                      </span>
                    ) : (
                      <span class="r">
                        {REASON_LABEL[m.reason] ?? m.reason}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        <div class="source-note">
          <span>{i18next.t("common:source")}</span>
          <span class="dset">
            Eduskunnan avoin data &middot; RollCallReport
          </span>
          <span>&middot;</span>
          <span>
            <span
              dangerouslySetInnerHTML={{
                __html: i18next.t("sessions:detail.absentees_explanation"),
              }}
            ></span>
          </span>
        </div>
      </div>
    </section>
  );
}

function SeatGrid({
  parties,
  totalPresent,
  totalAbsent,
}: {
  parties: {
    code: string;
    color: string;
    label: string;
    total: number;
    absent: number;
  }[];
  totalPresent: number;
  totalAbsent: number;
}) {
  return (
    <div
      class="seatgrid"
      role="img"
      aria-label={i18next.t("sessions:detail.seat_aria_label", {
        present: totalPresent,
        absent: totalAbsent,
      })}
    >
      {parties
        .filter((p) => p.total > 0)
        .map((p) => {
          const present = p.total - p.absent;
          const seats: string[] = [];
          for (let i = 0; i < present; i++) seats.push("pres");
          for (let i = 0; i < p.absent; i++) seats.push("abs");
          return seats.map((kind) => (
            <span
              class={clsx("seat", { absent: kind === "abs" })}
              style={`--p:${p.color}`}
              title={`${p.label} \u00b7 ${kind === "abs" ? i18next.t("sessions:detail.seat_absent_tooltip") : i18next.t("sessions:detail.seat_present_tooltip")}`}
            ></span>
          ));
        })}
    </div>
  );
}

function SeatLegend({
  parties,
}: {
  parties: { code: string; color: string; total: number }[];
}) {
  return (
    <div class="seat-legend">
      {parties
        .filter((p) => p.total > 0)
        .map((p) => (
          <span class="it">
            <span class="d" style={`background:${p.color}`}></span>
            {p.code}
          </span>
        ))}
      <span class="it">
        <span class="d ring"></span>
        {i18next.t("sessions:detail.seat_legend_absent")}
      </span>
    </div>
  );
}

function VotingSections({ sections }: { sections: AgendaSectionData[] }) {
  const totalVotes = sections.reduce(
    (sum, s) =>
      sum + s.items.reduce((a, i) => a + (i.votingPhase?.votes.length ?? 0), 0),
    0,
  );
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  return (
    <section class="ph" id="paatosasiat">
      <p class="kicker kicker--blue">
        <span class="dot"></span>
        {i18next.t("sessions:detail.section_voting_kicker")}
      </p>
      <div class="ph__head">
        <h2>{i18next.t("sessions:detail.section_voting_title")}</h2>
        <span class="meta">
          {i18next.t("sessions:detail.section_voting_meta", {
            items: totalItems,
            votes: totalVotes,
          })}
        </span>
      </div>
      <p class="ph__intro">
        {i18next.t("sessions:detail.section_voting_intro")}
      </p>

      {sections.map((s) =>
        s.items.map((item) => (
          <AgendaItemComponent item={item} isVoting={true} />
        )),
      )}

      <div class="source-note">
        <span>{i18next.t("common:source")}</span>
        <span class="dset">Eduskunnan avoin data &middot; Voting</span>
        <span>&middot;</span>
        <span class="fresh">
          {i18next.t("common:fetched", { timestamp: "" }).replace(/\s+$/, "")}
        </span>
      </div>
    </section>
  );
}

function DiscussionSections({ sections }: { sections: AgendaSectionData[] }) {
  const totalSpeeches = sections.reduce(
    (sum, s) =>
      sum + s.items.reduce((a, i) => a + (i.activity?.speechCount ?? 0), 0),
    0,
  );
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  return (
    <section class="ph" id="keskustelut">
      <p class="kicker">
        <span class="dot" style="background:var(--opp)"></span>
        {i18next.t("sessions:detail.section_discussion_kicker")}
      </p>
      <div class="ph__head">
        <h2>{i18next.t("sessions:detail.section_discussion_title")}</h2>
        <span class="meta">
          {i18next.t("sessions:detail.section_discussion_meta", {
            items: totalItems,
            speeches: totalSpeeches,
          })}
        </span>
      </div>
      <p class="ph__intro">
        {i18next.t("sessions:detail.section_discussion_intro")}
      </p>

      {sections.map((s) =>
        s.items.map((item) => (
          <AgendaItemComponent item={item} isVoting={false} />
        )),
      )}

      <div class="source-note">
        <span>{i18next.t("common:source")}</span>
        <span class="dset">
          Eduskunnan avoin data &middot; Speech + Section
        </span>
        <span>&middot;</span>
        <span class="fresh">
          {i18next.t("common:fetched", { timestamp: "" }).replace(/\s+$/, "")}
        </span>
      </div>
    </section>
  );
}

function TabledSection({ items }: { items: AgendaSectionData[] }) {
  return (
    <section class="ph" id="poydalle">
      <p class="kicker">
        <span class="dot" style="background:var(--faint)"></span>
        {i18next.t("sessions:detail.section_tabled_kicker")}
      </p>
      <div class="ph__head">
        <h2>{i18next.t("sessions:detail.section_tabled_title")}</h2>
        <span class="meta">
          {i18next.t("sessions:detail.section_tabled_meta", {
            items: items.reduce((s, g) => s + g.items.length, 0),
          })}
        </span>
      </div>
      <p class="ph__intro">
        {i18next.t("sessions:detail.section_tabled_intro")}
      </p>

      {items.map((g) =>
        g.items.map((item) => (
          <AgendaItemComponent item={item} isVoting={false} isTabled={true} />
        )),
      )}

      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-top:22px;padding-top:16px;border-top:1px solid var(--rule)">
        <div style="font-family:var(--mono);font-size:var(--fs-mono);color:var(--muted)"></div>
        <a href="/istunnot" hx-get="/istunnot" {...NAV} class="link-arrow">
          {i18next.t("common:back_to_sessions")}
        </a>
      </div>
    </section>
  );
}

function AgendaItemComponent({
  item,
  isVoting,
  isTabled,
}: {
  item: AgendaItemData;
  isVoting: boolean;
  isTabled?: boolean;
}) {
  const phaseIcon = isTabled ? "tabled" : isVoting ? "vote" : "talk";
  return (
    <div class="ag-item">
      <div class="ag-num">{String(item.number).padStart(2, "0")}</div>
      <div class="ag-body">
        {item.votingPhase && (
          <div class="ag-phase">
            <span class={`pk ${phaseIcon}`}></span>
            {item.votingPhase.label} &middot;{" "}
            {item.votingPhase.votes.length > 0
              ? i18next.t("votings:count", {
                  count: item.votingPhase.votes.length,
                })
              : i18next.t("sessions:detail.agenda_no_votings")}
          </div>
        )}
        {!item.votingPhase && (
          <div class="ag-phase">
            <span class={`pk ${phaseIcon}`}></span>
            {isTabled
              ? i18next.t("sessions:detail.phase_tabled_label")
              : i18next.t("sessions:detail.phase_discussion_label")}
          </div>
        )}

        {item.titleHref ? (
          <a
            href={item.titleHref}
            class="ag-title"
            hx-get={item.titleHref}
            hx-target="#main-content"
            hx-push-url="true"
            hx-swap="innerHTML"
          >
            {item.title}
          </a>
        ) : (
          <span class="ag-title">{item.title}</span>
        )}

        {item.documents.length > 0 && (
          <div class="ag-docs">
            {item.documents.map((doc) =>
              doc.documentId ? (
                <a
                  class={clsx("ag-doc", { cmt: doc.isCommittee })}
                  href={`/asiakirja/${doc.documentId}`}
                >
                  {doc.tunnus}
                </a>
              ) : (
                <span class={clsx("ag-doc", { cmt: doc.isCommittee })}>
                  {doc.tunnus}
                </span>
              ),
            )}
          </div>
        )}

        {item.votingPhase && item.votingPhase.votes.length > 0 && (
          <VoteList votes={item.votingPhase.votes} />
        )}

        {item.activity && !item.votingPhase && (
          <div class="ag-activity">
            <span class="ag-badge talk">
              <span class="i">🗣</span> {item.activity.speechCount}{" "}
              {i18next.t("common:speech_count")}
            </span>
            {!item.activity.hasVotings && (
              <span class="ag-badge none">
                {i18next.t("sessions:detail.agenda_no_votings")}
              </span>
            )}
          </div>
        )}

        {item.speakers && item.speakers.length > 0 && (
          <div class="ag-speakers">
            {item.speakers.map((sp) => (
              <span class="spk">
                <span class="d" style={`background:${sp.partyColor}`}></span>
                {sp.firstName} {sp.lastName} <small>{sp.party}</small>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VoteList({ votes }: { votes: VoteResultData[] }) {
  return (
    <div class="ag-votes">
      {votes.map((v) => (
        <div class="agvote">
          <div class="agvote__t">
            {v.id != null ? (
              <a
                href={`/aanestys/${v.id}`}
                style="color:var(--blue);text-decoration:none"
                hx-get={`/aanestys/${v.id}`}
                hx-target="#main-content"
                hx-push-url="true"
                hx-swap="innerHTML"
              >
                {v.title}
              </a>
            ) : (
              v.title
            )}
          </div>
          <div class="agvote__bar">
            <span class="j" style={`width:${v.yesPct.toFixed(1)}%`}></span>
            <span class="e" style={`width:${v.noPct.toFixed(1)}%`}></span>
          </div>
          <div class="agvote__n">
            <span class="j">{v.nYes}</span>&ndash;<span class="e">{v.nNo}</span>
            <span class={clsx("out", v.outcomeClass)}>{v.outcome}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
