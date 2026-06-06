import { Box, Skeleton } from "@mui/material";
import React from "react";

interface LazySectionProps {
  /**
   * Stable hash anchor for the section. We render an empty placeholder with
   * the same `id` so the URL hash + sticky-rail scroll-spy still find it
   * before the heavy children mount.
   */
  anchor: string;
  /** Reserved height while the section is unmounted, to keep layout stable. */
  minHeight?: number;
  /** Distance ahead of the viewport (px) at which we should start rendering. */
  rootMargin?: string;
  children: React.ReactNode;
}

/**
 * Wraps a profile section so its children only mount once the placeholder
 * scrolls within `rootMargin` of the viewport. Without this, every section
 * (each one running its own fetches and rendering hundreds of nodes) mounts
 * synchronously on page load, which freezes the main thread and produces a
 * white screen during scroll.
 *
 * Once a section has been mounted it stays mounted — we only defer the
 * *initial* mount, so scrolling back up does not throw away fetched state.
 */
export const LazySection: React.FC<LazySectionProps> = ({
  anchor,
  minHeight = 320,
  rootMargin = "600px 0px",
  children,
}) => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (mounted) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted, rootMargin]);

  // If the URL hash matches this anchor, mount immediately so the deep-link
  // scroll lands on real content rather than an empty placeholder.
  React.useEffect(() => {
    if (mounted) return;
    if (typeof window === "undefined") return;
    if (window.location.hash.slice(1) === anchor) {
      setMounted(true);
    }
  }, [anchor, mounted]);

  return (
    <Box
      ref={ref}
      id={anchor}
      data-lazy-anchor={anchor}
      sx={{
        minHeight: mounted ? undefined : minHeight,
        scrollMarginTop: 96,
      }}
    >
      {mounted ? (
        <React.Suspense
          fallback={
            <Skeleton variant="rectangular" height={Math.max(120, minHeight - 80)} />
          }
        >
          {children}
        </React.Suspense>
      ) : null}
    </Box>
  );
};
