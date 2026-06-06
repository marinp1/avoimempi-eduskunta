/** Entry point: imports all client-side modules (htmx config, period selector, trace system, islands). */
import "./htmx-config";
// Native browser loading indicator (tab spinner) for page navigations, via the
// Navigation API. Chromium-only; a no-op elsewhere. Must load after htmx-config
// so window.htmx exists when this IIFE registers itself. Opt-in per element with
// hx-browser-indicator="true" (see nav.tsx / period-selector.tsx).
import "htmx.org/dist/ext/hx-browser-indicator.js";
import "./period-island";
import "./trace-island";
import "./timeline-island";
import "./speech-filter-island";
import "./vote-filter-island";
import "./nav-morph";
