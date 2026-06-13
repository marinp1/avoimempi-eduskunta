/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import i18next from "i18next";
import { trustedHtml } from "#server/jsx/jsx-runtime";

/** Sitting tick: minimal data needed to render the timeline track. */
export interface SittingTick {
  /** ISO date "2026-05-28" */
  d: string;
  /** Session identifier "2026/57" */
  id: string;
  /** Tick type drives visual height/color on the track */
  type: "vote" | "talk" | "quiet" | "comp";
}

/** Data passed from the server to render the timeline and seed the client island. */
export interface TimelineData {
  /** Active electoral term: "2023" | "2019" | "all" */
  term: string;
  /** ISO date of the live "now" day (latest completed session) */
  today: string;
  /** Currently selected ISO date (from URL ?date= param) */
  cursor: string;
  /** Finnish-formatted cursor date for initial SSR display */
  cursorFormatted: string;
  /** All sitting days in the active term, ascending */
  sittings: SittingTick[];
  /** Whether to show the vote/talk/quiet legend (hidden for composition ticks) */
  showLegend?: boolean;
  /** When true, adds hx-swap-oob for out-of-band swaps during htmx navigation */
  oob?: boolean;
}

/** Serialises data for a JSON script block. Escapes `<` so the payload can
 *  never terminate the script element, and marks the result trusted so the
 *  JSX runtime does not entity-escape it (entities are not decoded inside
 *  `<script>`, which would corrupt the JSON). */
function safeJson(data: unknown): string {
  return trustedHtml(JSON.stringify(data).replaceAll("<", "\\u003c"));
}

/** Server-rendered timeline scrubber injected after the masthead on every page. */
export default function Timeline({ data }: { data: TimelineData }): string {
  const { cursor, today, sittings, showLegend = true, oob } = data;
  const isNow = cursor >= today;
  const relLabel = isNow
    ? i18next.t("components:timeline.now_label")
    : i18next.t("components:timeline.archive_label");
  const todayHidden = isNow || !sittings.some((s) => s.d === today);
  const currentId =
    sittings.find((s) => s.d === cursor)?.id ??
    sittings[sittings.length - 1]?.id ??
    "";
  const flagText = `${data.cursorFormatted} · ${currentId}`;

  return (
    <section
      id="timeline"
      class="timeline"
      data-timeline
      aria-label={i18next.t("components:timeline.scroll_aria")}
      hx-swap-oob={oob ? "true" : undefined}
    >
      <div class="tl__head">
        <div class="tl__lead">
          <span class="tl__kicker">
            {i18next.t("components:timeline.kicker")}
          </span>
          <span class="tl__date" data-tl-date>
            {data.cursorFormatted}
          </span>
          <span class={clsx("tl__rel", { "is-now": isNow })} data-tl-rel>
            {relLabel}
          </span>
        </div>
        {showLegend && (
          <div class="tl__legend">
            <span class="it">
              <span class="k t-vote"></span>
              {i18next.t("components:timeline.legend_vote")}
            </span>
            <span class="it">
              <span class="k t-talk"></span>
              {i18next.t("components:timeline.legend_talk")}
            </span>
            <span class="it">
              <span class="k t-quiet"></span>
              {i18next.t("components:timeline.legend_quiet")}
            </span>
          </div>
        )}
        <div class="tl__nav">
          <button
            class={clsx("tl__now", { "is-hidden": isNow })}
            data-tl-now
            type="button"
          >
            {i18next.t("components:timeline.back_to_now")}
          </button>
          <span class="tl__pair">
            <button
              class="tl__step"
              data-tl-prev
              type="button"
              disabled={sittings.length <= 1}
            >
              {i18next.t("components:timeline.prev")}
            </button>
            <button
              class="tl__step"
              data-tl-next
              type="button"
              disabled={isNow}
            >
              {i18next.t("components:timeline.next")}
            </button>
          </span>
        </div>
      </div>
      <div class="tl__track" data-tl-track>
        <div class="tl__grid" data-tl-grid></div>
        <div class="tl__axis"></div>
        <div class="tl__ticks" data-tl-ticks></div>
        <div class="tl__today" data-tl-today hidden={todayHidden}></div>
        <div
          class="tl__handle"
          data-tl-handle
          role="slider"
          aria-label={i18next.t("components:timeline.handle_aria")}
          tabindex="0"
        >
          <div class="tl__flag" data-tl-flag>
            {flagText}
          </div>
          <div class="tl__stem"></div>
          <div class="tl__knob"></div>
        </div>
      </div>
      <input type="hidden" id="tl-date-input" name="date" value={cursor} />
      <input
        type="hidden"
        id="tl-period-input"
        name="period"
        value={data.term}
      />
      <script type="application/json" id="tl-data">
        {safeJson({ term: data.term, today, cursor, sittings })}
      </script>
    </section>
  );
}
