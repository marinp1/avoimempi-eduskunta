/* Page-level data-trace ("Tietolähteet") overlay — open/close behavior.

   The footer button (`[data-trace-open]`) does an hx-get to /api/trace and swaps
   the overlay fragment into `#trace-overlay-root`. The graph is the primary
   surface: clicking a source/query node hx-gets its detail into the inline
   `#trace-detail` panel within the overlay. This island:
     - rewrites the request's `for` param to the LIVE url at request time, so the
       trace always matches the current page after htmx navigations;
     - opens the overlay once the fragment has been swapped in;
     - on each detail swap, scrolls the panel into view and marks the clicked
       node active;
     - handles close (button, scrim, Escape) via delegation, since the overlay
       markup is replaced on every open.

   Slide/scrim transitions mirror the about panel (`html.trace-open`,
   `.trace.is-open`, `.trace-scrim.is-open`). */

import {
  edgeKey,
  flowSubgraph,
  type GraphEdge,
} from "../features/trace/trace-graph-paths";

const ROOT = "trace-overlay-root";
const DETAIL = "trace-detail";

/** The pane's initial hint markup, captured per open so dismiss can restore it. */
let detailHintHtml: string | null = null;

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`#${ROOT} .trace`);
}
function scrim(): HTMLElement | null {
  return document.querySelector<HTMLElement>(`#${ROOT} .trace-scrim`);
}

function open(): void {
  const p = panel();
  const s = scrim();
  if (!p) return;
  // Lock background scroll first (gutter is reserved globally, so this is a
  // no-shift change), then reveal the modal on the next frame so the scrim/panel
  // fade in cleanly rather than over a reflow.
  document.documentElement.classList.add("trace-open");
  if (s) s.hidden = false;
  p.hidden = false;
  p.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    s?.classList.add("is-open");
    p.classList.add("is-open");
  });
}

function close(): void {
  const p = panel();
  const s = scrim();
  document.documentElement.classList.remove("trace-open");
  s?.classList.remove("is-open");
  if (!p) return;
  p.classList.remove("is-open");
  p.setAttribute("aria-hidden", "true");
  const done = () => {
    if (s) s.hidden = true;
    p.hidden = true;
    p.removeEventListener("transitionend", done);
  };
  p.addEventListener("transitionend", done);
  setTimeout(done, 360);
}

/** Dismisses the detail pane: restore the hint, drop the highlight, collapse. */
function closeDetail(): void {
  const detail = document.getElementById(DETAIL);
  if (detail && detailHintHtml != null) detail.innerHTML = detailHintHtml;
  clearHighlight();
  panel()?.classList.remove("is-engaged");
}

/** Clears every highlight class from the graph. */
function clearHighlight(): void {
  const svg = document.querySelector(`#${ROOT} .trace-svg`);
  svg?.classList.remove("has-selection");
  for (const el of document.querySelectorAll(
    `#${ROOT} .is-active, #${ROOT} .is-lit`,
  )) {
    el.classList.remove("is-active", "is-lit");
  }
}

/** Reads the lineage edges from the rendered SVG. */
function readEdges(): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const path of document.querySelectorAll(
    `#${ROOT} .trace-edge[data-from][data-to]`,
  )) {
    const from = path.getAttribute("data-from");
    const to = path.getAttribute("data-to");
    if (from && to) edges.push({ from, to });
  }
  return edges;
}

/**
 * After a node's detail swaps into the (stable, always-visible) bottom pane:
 * light the flow the clicked node participates in and dim the rest. No scrolling
 * — the pane is fixed below the graph, so nothing in the modal moves.
 */
function onDetailLoaded(source: Element | undefined): void {
  clearHighlight();
  const node = source?.closest<HTMLElement>("[data-node-id]");
  const startId = node?.getAttribute("data-node-id");
  if (!node || !startId) return;
  // Lock the detail pane to a stable height on first engagement so later swaps
  // change only its inner content (no modal reflow).
  panel()?.classList.add("is-engaged");
  node.classList.add("is-active");
  const { nodes, edges } = flowSubgraph(readEdges(), startId);
  const svg = document.querySelector(`#${ROOT} .trace-svg`);
  svg?.classList.add("has-selection");
  for (const el of document.querySelectorAll<HTMLElement>(
    `#${ROOT} .trace-node[data-node-id]`,
  )) {
    if (nodes.has(el.getAttribute("data-node-id")!)) {
      el.classList.add("is-lit");
    }
  }
  for (const path of document.querySelectorAll<HTMLElement>(
    `#${ROOT} .trace-edge[data-from][data-to]`,
  )) {
    const key = edgeKey(
      path.getAttribute("data-from")!,
      path.getAttribute("data-to")!,
    );
    if (edges.has(key)) path.classList.add("is-lit");
  }
}

function init(): void {
  // Send the live URL as the `for` param so the trace matches the current page
  // after htmx navigation (the footer button isn't re-rendered on swaps).
  // htmx v4: config:request carries detail.ctx; for GET the query params come
  // from ctx.request.body (a FormData).
  document.addEventListener("htmx:config:request", (evt: Event) => {
    const ctx = (evt as CustomEvent).detail?.ctx as
      | {
          sourceElement?: Element;
          request?: { body?: FormData };
          transition?: boolean;
        }
      | undefined;
    const src = ctx?.sourceElement;
    if (!src) return;
    // Any trace request (opening the overlay or loading node detail) must never
    // run through the global View Transition — otherwise the page is snapshotted
    // and the overlay blinks out during the crossfade.
    const isTrace =
      src.closest?.("[data-trace-open]") || src.closest?.(`#${ROOT}`);
    if (isTrace && ctx) ctx.transition = false;
    if (src.closest?.("[data-trace-open]")) {
      ctx?.request?.body?.set("for", location.pathname + location.search);
    }
  });

  // Open the overlay when its fragment swaps in; reveal node detail when a detail
  // fragment swaps into the inline panel. htmx v4 dispatches htmx:after:swap with
  // detail.ctx; ctx.target is the resolved swap target, ctx.sourceElement the
  // triggering node.
  document.addEventListener("htmx:after:swap", (evt: Event) => {
    const ctx = (evt as CustomEvent).detail?.ctx as
      | { target?: Element; sourceElement?: Element }
      | undefined;
    if (ctx?.target?.id === ROOT) {
      detailHintHtml = document.getElementById(DETAIL)?.innerHTML ?? null;
      open();
    } else if (ctx?.target?.id === DETAIL) onDetailLoaded(ctx.sourceElement);
  });

  // Delegated close handlers (overlay markup is replaced on every open).
  document.addEventListener("click", (e) => {
    const el = e.target as Element;
    if (el.closest("[data-trace-detail-close]")) {
      closeDetail();
    } else if (
      el.closest("[data-trace-close]") ||
      el.closest("[data-trace-scrim]")
    ) {
      close();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const p = panel();
    if (p && !p.hidden) close();
  });
}

document.addEventListener("DOMContentLoaded", init);
