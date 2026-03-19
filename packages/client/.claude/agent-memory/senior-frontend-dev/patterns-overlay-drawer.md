---
name: OverlayDrawer pattern
description: How to open and update the OverlayDrawer from page components — including the replaceDrawer pattern for live data updates
type: project
---

# OverlayDrawer Pattern

## Import
```tsx
import { useOverlayDrawer } from "#client/context/OverlayDrawerContext";
const { openRootDrawer, replaceDrawer, resetDrawer } = useOverlayDrawer();
```

## Config shape
```tsx
{
  drawerKey?: string;       // stable key to identify the drawer
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;         // chips/badges shown below subtitle
  actions?: ReactNode;      // action links shown in header
  content: ReactNode;
  onClose?: () => void;
}
```

## openRootDrawer vs replaceDrawer
- `openRootDrawer(config)` — clears the stack and opens a fresh drawer (use on first click)
- `replaceDrawer(config)` — replaces the top item in the stack without animation (use for live data updates via useEffect)
- `resetDrawer()` — clears the drawer entirely

## Live data update pattern
When the drawer content depends on async-loaded data, use `useEffect` to call `replaceDrawer` whenever the data state changes. See `Sessions/index.tsx` for the reference implementation.

```tsx
// Open drawer immediately on click (with loading state content)
openRootDrawer({ drawerKey: `section:${key}`, title, content: <Content /> });

// Update drawer as data arrives
useEffect(() => {
  if (!activeItem) return;
  replaceDrawer({ drawerKey: `section:${key}`, title, content: <Content /> });
}, [activeItem, data, replaceDrawer]);
```

## activeSection + session pattern (Home page)
The Home page tracks `activeSection: HomeSection | null`. When section data state changes (speeches, votings, etc.), `replaceDrawer` is called in a `useEffect` with `buildDrawerContent(activeSection, activeSectionSession)` to re-render the drawer with fresh data.

`activeSectionSession` is derived via `useMemo` that searches `allSessions` for the session containing `activeSection.id`.
