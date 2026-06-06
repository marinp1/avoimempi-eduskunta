/** @jsxImportSource ../../src/jsx */

/** Sitting tick: minimal data needed to render the timeline track. */
export interface SittingTick {
  /** ISO date "2026-05-28" */
  d: string;
  /** Session identifier "2026/57" */
  id: string;
  /** Tick type drives visual height/color on the track */
  type: "vote" | "talk" | "quiet";
}

/** Data passed from the server to render the timeline and seed the client island. */
export interface TimelineData {
  /** Active electoral term: "2023" | "2019" | "all" */
  term: string;
  /** ISO date of the live "now" day (latest completed session) */
  today: string;
  /** Currently selected ISO date (from peili_date cookie) */
  cursor: string;
  /** Finnish-formatted cursor date for initial SSR display */
  cursorFormatted: string;
  /** All sitting days in the active term, ascending */
  sittings: SittingTick[];
}

/** Serialises data for a JSON script block, escaping `</script>` sequences. */
function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
}

/** Server-rendered timeline scrubber injected after the masthead on every page. */
export function timeline(data: TimelineData): string {
  const { cursor, today, sittings } = data;
  const isNow = cursor >= today;
  const relLabel = isNow ? "nykyhetki" : "arkistonäkymä";
  const relClass = isNow ? "tl__rel is-now" : "tl__rel";
  const nowHidden = isNow ? " is-hidden" : "";
  const todayHidden = isNow || !sittings.some((s) => s.d === today);
  const currentId =
    sittings.find((s) => s.d === cursor)?.id ??
    sittings[sittings.length - 1]?.id ??
    "";

  return (
    <section class="timeline" data-timeline aria-label="Selaa vaalikautta">
      <div class="tl__head">
        <div class="tl__lead">
          <span class="tl__kicker">Tarkasteluhetki</span>
          <span class="tl__date" data-tl-date>
            {data.cursorFormatted}
          </span>
          <span class={relClass} data-tl-rel>
            {relLabel}
          </span>
        </div>
        <div class="tl__nav">
          <button class={`tl__now${nowHidden}`} data-tl-now type="button">
            Palaa nykyhetkeen →
          </button>
          <span class="tl__pair">
            <button
              class="tl__step"
              data-tl-prev
              type="button"
              disabled={sittings.length <= 1}
            >
              ‹ edellinen
            </button>
            <button
              class="tl__step"
              data-tl-next
              type="button"
              disabled={isNow}
            >
              seuraava ›
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
          aria-label="Tarkasteluhetki"
          tabindex="0"
        >
          <div class="tl__flag" data-tl-flag>
            {currentId}
          </div>
          <div class="tl__stem"></div>
          <div class="tl__knob"></div>
        </div>
      </div>
      <div class="tl__legend">
        <span class="it">
          <span class="k t-vote"></span>äänestyspäivä
        </span>
        <span class="it">
          <span class="k t-talk"></span>keskustelu
        </span>
        <span class="it">
          <span class="k t-quiet"></span>muu istunto
        </span>
        <span class="hint">vedä kahvasta · ‹ › · tai napauta janaa</span>
      </div>
      <input type="hidden" id="tl-date-input" name="date" value={cursor} />
      <script type="application/json" id="tl-data">
        {safeJson({ term: data.term, today, cursor, sittings })}
      </script>
    </section>
  );
}
