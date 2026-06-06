---
name: htmx-patterns
description: HTMX v4 best practices, attribute reference, and patterns for the packages/webapp frontend
metadata:
  type: project
---

# HTMX v4 Patterns & Best Practices

**packages/webapp** is the active frontend (htmx-based). packages/client is deprecated.

## Core Mental Model

HTMX is **server-driven HTML**, not client-driven JSON+JS. The server owns state and returns HTML fragments. The browser swaps them in.

- Server → HTML fragments (not JSON)
- Client → htmx swaps fragments into the DOM
- No client-side rendering. No framework state.

## Bootstrap Setup

- Entry: `packages/webapp/index.html` → `src/setup.ts` (bundled by Bun)
- Config: `src/setup.ts` sets `htmx.config.*` (see valid props in `node_modules/htmx.org/dist/htmx.d.ts`)
- CSS: `src/styles.css` — CSS custom properties, reset, layout

Valid `htmx.config` properties (v4 `HtmxConfig` type):
```
defaultSwap, defaultFocusScroll, defaultSettleDelay, defaultTimeout,
transitions, history, mode, prefix, logAll, indicatorClass,
requestClass, includeIndicatorCSS, inlineScriptNonce, inlineStyleNonce,
extensions, morphIgnore, morphScanLimit, morphSkip, morphSkipChildren,
noSwap, implicitInheritance, metaCharacter
```

## Core Attributes

| Attribute | Purpose |
|---|---|
| `hx-get/post/put/patch/delete` | HTTP method + URL |
| `hx-target` | CSS selector for where response is swapped |
| `hx-swap` | Swap strategy (see below) |
| `hx-trigger` | Event that fires the request |
| `hx-push-url="true"` | Adds URL to browser history |
| `hx-boost="true"` | Converts child `<a>` and `<form>` to htmx |
| `hx-select` | Extract a portion of the response |
| `hx-include` | Add extra form values to request |
| `hx-indicator` | Element that shows htmx-request class during load |
| `hx-ignore` | Block htmx from processing this subtree (for untrusted content) |

## hx-swap Values

```
innerHTML      default — replace inner content
outerHTML      replace entire element
beforebegin    insert before element
afterend       insert after element
afterbegin     prepend inside element
beforeend      append inside element
delete         remove element (ignore response)
none           do nothing
innerMorph     morph inner content (preserves state)
outerMorph     morph entire element (preserves state)
```

With modifiers: `hx-swap="innerHTML transition:true"` — enables View Transitions API.

## hx-trigger Modifiers

```html
hx-trigger="click"                  <!-- default for buttons -->
hx-trigger="change"                 <!-- default for inputs -->
hx-trigger="submit"                 <!-- default for forms -->
hx-trigger="load"                   <!-- on page load -->
hx-trigger="revealed"               <!-- when scrolled into view -->
hx-trigger="intersect"              <!-- IntersectionObserver -->
hx-trigger="every 30s"              <!-- polling -->
hx-trigger="keyup changed delay:500ms"  <!-- debounced search -->
hx-trigger="click from:#other-el"  <!-- listen on different element -->
```

## Navigation Pattern (nav in index.html)

```html
<nav hx-boost="true"
     hx-target="#main-content"
     hx-push-url="true"
     hx-swap="innerHTML transition:true">
  <a href="/edustajat">Edustajat</a>
</nav>
<main id="main-content">...</main>
```

`hx-boost` on the `<nav>` converts all child `<a>` tags to htmx requests that swap `#main-content`. The server returns only the page fragment, not the full shell.

## Server Response Headers (HX-*)

The Bun server can return these headers to control client behaviour:

| Header | Effect |
|---|---|
| `HX-Push-Url: /path` | Push a URL to history |
| `HX-Replace-Url: /path` | Replace current URL |
| `HX-Redirect: /path` | Client-side redirect (no full reload) |
| `HX-Refresh: true` | Trigger full page refresh |
| `HX-Retarget: #selector` | Override hx-target |
| `HX-Reswap: outerHTML` | Override hx-swap |
| `HX-Trigger: event-name` | Fire a client event |

## Request Headers (htmx sends automatically)

```
HX-Request: "true"
HX-Current-URL: <browser URL>
HX-Source: <triggering element CSS selector>
HX-Target: <target element CSS selector>
HX-Boosted: "true"  (only for hx-boost requests)
```

Use these in Bun route handlers to detect and return partial HTML:
```typescript
if (req.headers.get("HX-Request")) {
  return new Response(fragmentHtml, { headers: { "Content-Type": "text/html" } });
}
// else return full page
```

## Status-Code Conditional Swaps (v4 feature)

```html
<form hx-post="/submit"
      hx-target="#result"
      hx-status:422="target:#validation-errors"
      hx-status:500="target:#server-error">
```

## Security Rules

1. **Escape all user content** before injecting into HTML responses — XSS via htmx is real
2. **Use `hx-ignore`** when rendering untrusted HTML that may contain htmx attributes
3. **CORS**: htmx defaults to `same-origin` mode — do not loosen without CSP `connect-src`
4. **CSRF**: add token via `hx-headers='{"X-CSRF-Token": "..."}` on `<body>` or `<form>`

## Loading Indicators

```html
<div hx-get="/data" hx-indicator="#spinner">Load</div>
<span id="spinner" class="htmx-indicator">Loading…</span>
```

The `.htmx-indicator` class has `opacity:0` by default; `.htmx-request` makes it `opacity:1`. Already wired in `src/styles.css`.

## Best Practices

- **Return HTML fragments** from API endpoints when `HX-Request` header is present
- **Use `204 No Content`** for actions that should not swap DOM (e.g. delete with no UI update)
- **Avoid 3xx redirects** — use `HX-Location` or `HX-Redirect` headers for htmx-aware navigation
- **Keep fragments small** — return only the changed portion, not the whole page section
- **Server is authoritative** — never compute final UI state in JS; let the server decide
- **`hx-boost` on `<body>`** replaces full `<body>` on navigation; prefer targeting `#main-content`
- **Use `innerMorph`/`outerMorph`** when preserving focus/scroll/Alpine state across swaps
