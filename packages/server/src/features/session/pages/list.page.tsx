/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import PageHead from "#server/components/page-head";
import Spill from "#server/components/spill";
import Rule from "#server/components/rule";
import i18next from "i18next";
import type {
  SessionsIndexData,
  WeekGroup,
  SessionRow,
  Dchip,
} from "./list.view-model";

interface Props {
  title?: string;
  data?: SessionsIndexData;
  /** Finnish-formatted cursor date shown in the "as-of" indicator */
  cursorFormatted?: string;
}

function statusLabel(s: "done" | "draft" | "live"): string {
  switch (s) {
    case "live":
      return i18next.t("sessions:status_live");
    case "done":
      return i18next.t("sessions:status_done");
    case "draft":
      return i18next.t("sessions:status_draft");
  }
}

export default function Istunnot({ title, data, cursorFormatted }: Props) {
  const d = data!;
  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: title || "",
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <PageHead
          kicker={i18next.t("sessions:kicker")}
          heading={i18next.t("sessions:heading")}
          subtitle={i18next.t("sessions:subtitle")}
        />
      </div>

      <Rule />

      <SessionList
        weeks={d.weeks}
        totalSessions={d.totalSessions}
        cursorFormatted={cursorFormatted}
      />

      <div class="wrap">
        <div class="source-note">
          <span>{i18next.t("common:source")}</span>
          <span class="dset">
            Eduskunnan avoin data · Session + Voting + Speech
          </span>
          <span>·</span>
          <span class="fresh">
            {i18next.t("common:fetched", { timestamp: d.fetchedAt })}
          </span>
          <span>·</span>
          <span
            class="cite verify"
            data-mark="off"
            data-value="2026/46–2026/55"
            data-caption="Kevätistuntokauden 2026 täysistunnot — viimeisimmät"
            data-set="Eduskunnan avoin data · Session"
            data-table="Session + Voting + Speech + Section"
            data-endpoint="SELECT key, date, state_text_fi, minutes_title FROM Session WHERE type='TAYSISTUN' ORDER BY date DESC"
            data-record={`${d.totalSessions} istuntoa`}
            data-jakso="Vaalikausi 2023–2027"
            data-fetched={d.fetchedAt}
            data-chain="avoindata.eduskunta.fi > Session > Istuntolista"
            data-url="https://avoindata.eduskunta.fi/"
            data-orig="Avaa aineisto"
          >
            {i18next.t("common:verify_trace")}
          </span>
        </div>
      </div>
    </>
  );
}

export function SessionList({
  weeks,
  totalSessions,
  cursorFormatted,
}: {
  weeks: WeekGroup[];
  totalSessions: number;
  cursorFormatted?: string;
}) {
  return (
    <div
      id="tl-reactive"
      class="wrap loading-overlay"
      hx-get="/istunnot"
      hx-trigger="tl:commit from:document"
      hx-include:inherited="#tl-date-input, #tl-period-input"
      hx-swap="outerHTML"
      hx-push-url="true"
      hx-indicator="#tl-reactive"
    >
      <div class="htmx-indicator loading-spinner">
        {i18next.t("common:loading")}
      </div>
      <div class="toolbar">
        <label class="search">
          <span class="ic">⌕</span>
          <input
            id="sit-search"
            type="text"
            placeholder={i18next.t("sessions:search_placeholder")}
            name="q"
            hx-get="/istunnot"
            hx-trigger="input changed delay:200ms"
            hx-target="#sit-root"
            hx-select="#sit-root"
            hx-swap="outerHTML"
            hx-push-url="true"
            hx-indicator="#sit-root"
          />
        </label>
        <span class="count">
          <b id="sit-count">{totalSessions}</b>{" "}
          {i18next.t("sessions:count_suffix")}
        </span>
        {cursorFormatted && (
          <span class="sit-asof" data-sit-asof>
            {i18next.t("sessions:as_of")} <b data-tl-asof>{cursorFormatted}</b>
          </span>
        )}
      </div>

      <div class="fchips">
        <a
          class="fchip is-active"
          href="/istunnot"
          hx-get="/istunnot"
          hx-target="#sit-root"
          hx-select="#sit-root"
          hx-swap="outerHTML"
          hx-push-url="true"
          hx-indicator="#sit-root"
        >
          {i18next.t("sessions:filter_all")}
        </a>
        <a
          class="fchip"
          href="/istunnot?kind=vote"
          hx-get="/istunnot?kind=vote"
          hx-target="#sit-root"
          hx-select="#sit-root"
          hx-swap="outerHTML"
          hx-push-url="true"
          hx-indicator="#sit-root"
        >
          <span class="pdot" style="background:var(--blue)"></span>
          {i18next.t("sessions:filter_vote_days")}
        </a>
        <a
          class="fchip"
          href="/istunnot?kind=kysely"
          hx-get="/istunnot?kind=kysely"
          hx-target="#sit-root"
          hx-select="#sit-root"
          hx-swap="outerHTML"
          hx-push-url="true"
          hx-indicator="#sit-root"
        >
          <span class="pdot" style="background:var(--opp)"></span>
          {i18next.t("sessions:filter_question_hour")}
        </a>
        <a
          class="fchip"
          href="/istunnot?kind=vali"
          hx-get="/istunnot?kind=vali"
          hx-target="#sit-root"
          hx-select="#sit-root"
          hx-swap="outerHTML"
          hx-push-url="true"
          hx-indicator="#sit-root"
        >
          <span class="pdot" style="background:var(--red)"></span>
          {i18next.t("sessions:filter_interpellation")}
        </a>
        <a
          class="fchip"
          href="/istunnot?kind=talk"
          hx-get="/istunnot?kind=talk"
          hx-target="#sit-root"
          hx-select="#sit-root"
          hx-swap="outerHTML"
          hx-push-url="true"
          hx-indicator="#sit-root"
        >
          <span class="pdot" style="background:var(--faint)"></span>
          {i18next.t("sessions:filter_discussions")}
        </a>
      </div>

      <div id="sit-root" class="loading-overlay">
        <div class="htmx-indicator loading-spinner">
          {i18next.t("common:loading")}
        </div>
        {weeks.map((week) => (
          <section class="week" data-week>
            <div class="week-head">
              <span class="week-head__k">{week.label}</span>
              <span class="week-head__t">{week.dateRange}</span>
              <span class="week-head__meta">{week.meta}</span>
            </div>
            <div class="sit-list">
              {week.sessions.map((s) => (
                <SessionRowComponent session={s} />
              ))}
            </div>
          </section>
        ))}

        <div
          id="sit-empty"
          class="src-row"
          hidden
          style="display:block;text-align:center;color:var(--muted);padding:40px 0;border:0"
        >
          {i18next.t("sessions:none_found")}
        </div>
      </div>
    </div>
  );
}

function SessionRowComponent({ session }: { session: SessionRow }) {
  return (
    <a
      class="sit-row"
      href={session.href}
      data-kind={session.kind}
      data-date={session.date}
      data-text={session.searchText}
    >
      <div class="sit-date">
        <span class="sit-dow">
          <span class={`kdot ${session.dotClass}`}></span>
          {session.dayOfWeek}
        </span>
        <span class="sit-day">{session.dayNum}</span>
        <span class="sit-mon">{session.month}</span>
      </div>
      <div class="sit-main">
        <div class="sit-top">
          <span class="sit-id">{session.sessionId}</span>
          <Spill text={statusLabel(session.status)} modifier={session.status} />
          {session.timeRange && (
            <span class="sit-time">{session.timeRange}</span>
          )}
        </div>
        <div class="sit-head">{session.headline}</div>
        {session.note && <div class="sit-note">{session.note}</div>}
        {session.dchips.length > 0 && (
          <div class="sit-items">
            {session.dchips.map((chip) => (
              <DchipComponent chip={chip} />
            ))}
          </div>
        )}
      </div>
      <div class="sit-meta">
        <div class="sit-figs">
          <div class="sit-fig">
            <b class={clsx({ zero: session.votingCount === 0 })}>
              {session.votingCount}
            </b>
            <span>
              {session.votingCount === 1
                ? i18next.t("common:voting_count_one")
                : i18next.t("common:voting_count_many")}
            </span>
          </div>
          <div class="sit-fig">
            <b>{session.sectionCount}</b>
            <span>{i18next.t("common:agenda_items")}</span>
          </div>
        </div>
        <span class="sit-go">{i18next.t("common:open_istunto")}</span>
      </div>
    </a>
  );
}

function DchipComponent({ chip }: { chip: Dchip }) {
  if (chip.isMore) {
    return (
      <span class={clsx("dchip", { "dchip--more": chip.isMore })}>
        {chip.text}
      </span>
    );
  }
  return (
    <span class="dchip">
      {chip.kind && <span class="dchip__k">{chip.kind}</span>}
      <span class="dchip__t">{chip.text}</span>
      {chip.result && (
        <span class={clsx("dchip__r", chip.result.class)}>
          {chip.result.text}
        </span>
      )}
    </span>
  );
}
