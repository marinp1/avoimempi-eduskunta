/**
 * Shared-element morph for roster -> profile navigation.
 *
 * Roster rows are plain <a href> links, so clicking one is a full-document
 * navigation (not an htmx swap). Cross-document View Transitions are enabled
 * globally via `@view-transition { navigation: auto }` in CSS. The profile
 * page statically names its hero elements (one representative per page), but
 * the roster has ~200 rows — so we can only name the *clicked* row, otherwise
 * a `view-transition-name` would be duplicated and the browser aborts the
 * transition. We do that here, on `pageswap`, right before the old page is
 * snapshotted.
 *
 * Pairs (must match the static names in _components.css on the profile side):
 *   .mp-name      -> .bio-name          (vt-bio-name)
 *   .c-dot > span -> .bio-portrait .pbar (vt-bio-accent)
 */
const PROFILE_PATH = /^\/edustaja\/(\d+)\/?$/;

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// `onpageswap` exists only where cross-document View Transitions are supported
// (Chromium 124+). Elsewhere this is a no-op and navigation falls back to a
// plain page load.
if (!reduceMotion && "onpageswap" in window) {
  window.addEventListener("pageswap", (event) => {
    const e = event as PageSwapEvent;
    // Only morph when an actual transition is running and we know the target.
    const destUrl = e.activation?.entry?.url;
    if (!e.viewTransition || !destUrl) return;

    const match = new URL(destUrl).pathname.match(PROFILE_PATH);
    if (!match) return;

    const id = match[1];
    const row = document.querySelector<HTMLElement>(
      `.mp-row[href="/edustaja/${id}"]`,
    );
    if (!row) return;

    const name = row.querySelector<HTMLElement>(".mp-name");
    const accent = row.querySelector<HTMLElement>(".c-dot > span");
    if (name) name.style.viewTransitionName = "vt-bio-name";
    if (accent) accent.style.viewTransitionName = "vt-bio-accent";

    // Clear the names once the transition settles so a bfcache restore of this
    // page doesn't leave duplicate names lying around for the next navigation.
    e.viewTransition.finished.finally(() => {
      if (name) name.style.viewTransitionName = "";
      if (accent) accent.style.viewTransitionName = "";
    });
  });
}
